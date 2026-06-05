import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { GameRound, GameType, GameResult } from '../entities/game-round.entity';
import { EconomyService } from '../../economy/economy.service';
import { TransactionType } from '../../economy/entities/transaction.entity';
import { AntiFraudService } from '../../anti-fraud/anti-fraud.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-log.entity';
import { AppLogger } from '../../common/logger/app-logger.service';
import { AchievementsService } from '../../achievements/achievements.service';
import { MissionsService } from '../../missions/missions.service';
import { VipService } from '../../vip/vip.service';
import { EventsGateway } from '../../websocket/events.gateway';

const HOUSE_EDGE = 0.04;
const MIN_BET = 10;
const MAX_BET = 100_000;

@Injectable()
export class CrashService {
  constructor(
    @InjectRepository(GameRound) private readonly roundRepo: Repository<GameRound>,
    private readonly economyService: EconomyService,
    private readonly antiFraud: AntiFraudService,
    private readonly auditService: AuditService,
    private readonly logger: AppLogger,
    private readonly dataSource: DataSource,
    private readonly achievementsService: AchievementsService,
    private readonly missionsService: MissionsService,
    private readonly vipService: VipService,
    private readonly eventsGateway: EventsGateway,
  ) {
    this.logger.setContext('CrashService');
  }

  generateProvablyFairCrash(serverSeed?: string): { crashPoint: number; serverSeed: string; hash: string } {
    const seed = serverSeed || crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHmac('sha256', seed).update(seed).digest('hex');
    const hashInt = parseInt(hash.slice(0, 8), 16);
    const E = Math.pow(2, 32);

    if (hashInt % 33 === 0) {
      return { crashPoint: 1.0, serverSeed: seed, hash };
    }

    const crashPoint = Math.max(
      1.0,
      Math.floor(((100 * E - hashInt) / (E - hashInt)) * (1 - HOUSE_EDGE)) / 100,
    );

    return { crashPoint: Math.min(crashPoint, 1000), serverSeed: seed, hash };
  }

  async placeBet(userId: string, betAmount: number, autoCashOut?: number, ip?: string) {
    if (betAmount < MIN_BET) throw new BadRequestException(`Minimum bet is ${MIN_BET} coins`);
    if (betAmount > MAX_BET) throw new BadRequestException(`Maximum bet is ${MAX_BET.toLocaleString()} coins`);
    if (autoCashOut && autoCashOut < 1.01) throw new BadRequestException('Auto cash-out must be >= 1.01x');
    if (autoCashOut && autoCashOut > 1000) throw new BadRequestException('Auto cash-out must be <= 1000x');

    const velocityCheck = await this.antiFraud.checkBetVelocity(userId, ip || '');
    if (!velocityCheck.allowed) throw new BadRequestException(velocityCheck.reason);

    const { crashPoint, serverSeed, hash } = this.generateProvablyFairCrash();

    const { transaction, wallet } = await this.economyService.debit(
      userId,
      betAmount,
      TransactionType.GAME_BET,
      'Crash game bet',
      undefined,
      { game: 'crash', betAmount },
    );

    const round = this.roundRepo.create({
      userId,
      type: GameType.CRASH,
      betAmount,
      crashPoint,
      metadata: { autoCashOut, serverSeed, hash, ip, transactionId: transaction.id },
    });
    const savedRound = await this.roundRepo.save(round);

    const willWin = !!(autoCashOut && autoCashOut <= crashPoint);

    await this.auditService.log({
      userId,
      action: AuditAction.GAME_BET,
      ip,
      referenceId: savedRound.id,
      metadata: { game: 'crash', betAmount, autoCashOut, crashPoint },
    });

    this.eventsGateway.emitBalanceUpdate(userId, Number(wallet.balance));
    this.logger.debug('Crash bet placed', { userId, betAmount, crashPoint, roundId: savedRound.id });

    return { roundId: savedRound.id, crashPoint, willWin, cashOutAt: willWin ? autoCashOut : null, hash };
  }

  async cashOut(userId: string, roundId: string, multiplier: number) {
    if (multiplier < 1.0) throw new BadRequestException('Multiplier must be >= 1.0');
    if (multiplier > 1000) throw new BadRequestException('Multiplier must be <= 1000');

    return this.dataSource.transaction(async (manager) => {
      const round = await manager
        .getRepository(GameRound)
        .createQueryBuilder('r')
        .where('r.id = :roundId AND r.userId = :userId', { roundId, userId })
        .setLock('pessimistic_write')
        .getOne();

      if (!round) throw new BadRequestException('Round not found');
      if (round.result) throw new ConflictException('Round already settled');
      if (round.type !== GameType.CRASH) throw new BadRequestException('Invalid round type');

      const crashPoint = Number(round.crashPoint);

      if (multiplier > crashPoint) {
        round.result = GameResult.LOSS;
        round.cashOutAt = multiplier;
        await manager.save(round);

        await this.auditService.log({
          userId,
          action: AuditAction.GAME_LOSS,
          referenceId: roundId,
          metadata: { game: 'crash', betAmount: round.betAmount, crashPoint, attemptedCashOut: multiplier },
        });

        // Track missions for loss
        this.missionsService.updateProgress(userId, 'games_played', 1).catch(() => {});
        this.vipService.addWager(userId, Number(round.betAmount)).catch(() => {});

        return { won: false, payout: 0, crashPoint };
      }

      const payout = Math.floor(Number(round.betAmount) * multiplier);
      round.result = GameResult.WIN;
      round.payoutAmount = payout;
      round.multiplier = multiplier;
      round.cashOutAt = multiplier;
      await manager.save(round);

      const { wallet } = await this.economyService.credit(
        userId,
        payout,
        TransactionType.GAME_WIN,
        `Crash game win ×${multiplier}`,
        roundId,
        { game: 'crash', multiplier, crashPoint },
      );

      await this.auditService.log({
        userId,
        action: AuditAction.GAME_WIN,
        referenceId: roundId,
        metadata: { game: 'crash', betAmount: round.betAmount, multiplier, payout, crashPoint },
      });

      this.eventsGateway.emitBalanceUpdate(userId, Number(wallet.balance));

      // Side effects in background
      this.runPostWinSideEffects(userId, multiplier, Number(round.betAmount)).catch(() => {});
      this.antiFraud.checkWinPattern(userId).catch(() => {});

      this.logger.log('Crash cash-out', { userId, roundId, multiplier, payout });
      return { won: true, payout, multiplier, crashPoint };
    });
  }

  private async runPostWinSideEffects(userId: string, multiplier: number, betAmount: number) {
    const gamesPlayed = await this.roundRepo.count({ where: { userId, type: GameType.CRASH } });

    await Promise.allSettled([
      this.missionsService.updateProgress(userId, 'games_played', 1),
      this.missionsService.updateProgress(userId, 'crash_wins', 1),
      this.vipService.addWager(userId, betAmount),
      this.achievementsService.triggerGamePlayedCheck(userId, gamesPlayed),
      this.achievementsService.triggerCrashMultiplierCheck(userId, multiplier),
    ]);
  }

  async getHistory(userId: string, limit = 20) {
    return this.roundRepo.find({
      where: { userId, type: GameType.CRASH },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
    });
  }

  async getPublicHistory(limit = 20) {
    return this.roundRepo
      .createQueryBuilder('r')
      .where('r.type = :type', { type: GameType.CRASH })
      .orderBy('r.createdAt', 'DESC')
      .take(Math.min(limit, 50))
      .getMany();
  }

  async verifyCrash(serverSeed: string, reportedCrashPoint: number): Promise<boolean> {
    const { crashPoint } = this.generateProvablyFairCrash(serverSeed);
    return Math.abs(crashPoint - reportedCrashPoint) < 0.01;
  }
}
