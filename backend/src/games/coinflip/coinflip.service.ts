import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameRound, GameType, GameResult } from '../entities/game-round.entity';
import { EconomyService } from '../../economy/economy.service';
import { TransactionType } from '../../economy/entities/transaction.entity';
import { AchievementsService } from '../../achievements/achievements.service';
import { MissionsService } from '../../missions/missions.service';
import { VipService } from '../../vip/vip.service';
import { EventsGateway } from '../../websocket/events.gateway';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-log.entity';
import { AntiFraudService } from '../../anti-fraud/anti-fraud.service';
import { AppLogger } from '../../common/logger/app-logger.service';

export type CoinSide = 'heads' | 'tails';

@Injectable()
export class CoinflipService {
  constructor(
    @InjectRepository(GameRound) private readonly roundRepo: Repository<GameRound>,
    private readonly economyService: EconomyService,
    private readonly achievementsService: AchievementsService,
    private readonly missionsService: MissionsService,
    private readonly vipService: VipService,
    private readonly eventsGateway: EventsGateway,
    private readonly auditService: AuditService,
    private readonly antiFraud: AntiFraudService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('CoinflipService');
  }

  async flip(userId: string, betAmount: number, choice: CoinSide, ip?: string) {
    if (betAmount < 10) throw new BadRequestException('Minimum bet is 10 coins');
    if (betAmount > 50_000) throw new BadRequestException('Maximum bet is 50,000 coins');

    const velocityCheck = await this.antiFraud.checkBetVelocity(userId, ip || '');
    if (!velocityCheck.allowed) throw new BadRequestException(velocityCheck.reason);

    const { wallet: walletAfterBet } = await this.economyService.debit(
      userId,
      betAmount,
      TransactionType.GAME_BET,
      'Coinflip bet',
      undefined,
      { game: 'coinflip', choice },
    );

    const result: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === choice;
    const payout = won ? Math.floor(betAmount * 1.95) : 0;

    const round = this.roundRepo.create({
      userId,
      type: GameType.COINFLIP,
      betAmount,
      payoutAmount: payout,
      multiplier: won ? 1.95 : 0,
      result: won ? GameResult.WIN : GameResult.LOSS,
      metadata: { choice, result, won, ip },
    });
    await this.roundRepo.save(round);

    let finalBalance = Number(walletAfterBet.balance);

    if (won) {
      const { wallet } = await this.economyService.credit(
        userId,
        payout,
        TransactionType.GAME_WIN,
        'Coinflip win',
        round.id,
        { game: 'coinflip', multiplier: 1.95 },
      );
      finalBalance = Number(wallet.balance);

      await this.auditService.log({
        userId, action: AuditAction.GAME_WIN, ip,
        referenceId: round.id,
        metadata: { game: 'coinflip', betAmount, payout, choice, result },
      });
    } else {
      await this.auditService.log({
        userId, action: AuditAction.GAME_LOSS, ip,
        referenceId: round.id,
        metadata: { game: 'coinflip', betAmount, choice, result },
      });
    }

    this.eventsGateway.emitBalanceUpdate(userId, finalBalance);

    // Side effects — fire and forget
    this.runSideEffects(userId, betAmount, won).catch(() => {});

    this.logger.debug('Coinflip result', { userId, won, choice, result, payout });
    return { won, result, choice, payout, betAmount };
  }

  private async runSideEffects(userId: string, betAmount: number, won: boolean) {
    const gamesPlayed = await this.roundRepo.count({ where: { userId, type: GameType.COINFLIP } });

    await Promise.allSettled([
      this.missionsService.updateProgress(userId, 'games_played', 1),
      ...(won ? [this.missionsService.updateProgress(userId, 'coinflip_wins', 1)] : []),
      this.vipService.addWager(userId, betAmount),
      this.achievementsService.triggerGamePlayedCheck(userId, gamesPlayed),
    ]);
  }

  async getHistory(userId: string, limit = 20) {
    return this.roundRepo.find({
      where: { userId, type: GameType.COINFLIP },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
    });
  }
}
