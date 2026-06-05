import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameRound, GameType, GameResult } from '../entities/game-round.entity';
import { EconomyService } from '../../economy/economy.service';
import { TransactionType } from '../../economy/entities/transaction.entity';
import * as crypto from 'crypto';

@Injectable()
export class CrashService {
  private activeRounds = new Map<string, { crashPoint: number; startTime: number }>();

  constructor(
    @InjectRepository(GameRound) private readonly roundRepo: Repository<GameRound>,
    private readonly economyService: EconomyService,
  ) {}

  private generateCrashPoint(): number {
    const seed = crypto.randomBytes(8).toString('hex');
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    const value = parseInt(hash.slice(0, 8), 16);
    const e = 2 ** 32;
    const crashPoint = Math.max(1.0, (e - value) / (e - value) * (100 / 4) + 1);
    const houseEdge = 0.04;
    const adjustedCrash = Math.max(1.0, (1 / (Math.random() + houseEdge)));
    return Math.round(Math.min(adjustedCrash, 1000) * 100) / 100;
  }

  async placeBet(userId: string, betAmount: number, autoCashOut?: number) {
    if (betAmount < 10) throw new BadRequestException('Minimum bet is 10 coins');
    if (betAmount > 100000) throw new BadRequestException('Maximum bet is 100,000 coins');

    const crashPoint = this.generateCrashPoint();
    const startTime = Date.now();

    await this.economyService.debit(
      userId,
      betAmount,
      TransactionType.GAME_BET,
      'Crash game bet',
    );

    const round = this.roundRepo.create({
      userId,
      type: GameType.CRASH,
      betAmount,
      crashPoint,
      metadata: { autoCashOut, startTime },
    });
    const savedRound = await this.roundRepo.save(round);

    this.activeRounds.set(savedRound.id, { crashPoint, startTime });

    let willWin = false;
    let cashOutAt = 0;

    if (autoCashOut && autoCashOut <= crashPoint) {
      willWin = true;
      cashOutAt = autoCashOut;
    }

    return {
      roundId: savedRound.id,
      crashPoint,
      willWin,
      cashOutAt: willWin ? cashOutAt : null,
    };
  }

  async cashOut(userId: string, roundId: string, multiplier: number) {
    const round = await this.roundRepo.findOne({
      where: { id: roundId, userId },
    });
    if (!round) throw new BadRequestException('Round not found');
    if (round.result) throw new BadRequestException('Round already settled');

    const { crashPoint } = this.activeRounds.get(roundId) || { crashPoint: round.crashPoint };

    if (multiplier > Number(crashPoint)) {
      round.result = GameResult.LOSS;
      round.cashOutAt = multiplier;
      await this.roundRepo.save(round);
      this.activeRounds.delete(roundId);
      return { won: false, payout: 0, crashPoint: Number(crashPoint) };
    }

    const payout = Math.floor(Number(round.betAmount) * multiplier);
    round.result = GameResult.WIN;
    round.payoutAmount = payout;
    round.multiplier = multiplier;
    round.cashOutAt = multiplier;
    await this.roundRepo.save(round);
    this.activeRounds.delete(roundId);

    await this.economyService.credit(
      userId,
      payout,
      TransactionType.GAME_WIN,
      `Crash game win x${multiplier}`,
      roundId,
    );

    return { won: true, payout, multiplier, crashPoint: Number(crashPoint) };
  }

  async getHistory(userId: string, limit = 20) {
    return this.roundRepo.find({
      where: { userId, type: GameType.CRASH },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
