import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameRound, GameType, GameResult } from '../entities/game-round.entity';
import { EconomyService } from '../../economy/economy.service';
import { TransactionType } from '../../economy/entities/transaction.entity';

export type CoinSide = 'heads' | 'tails';

@Injectable()
export class CoinflipService {
  constructor(
    @InjectRepository(GameRound) private readonly roundRepo: Repository<GameRound>,
    private readonly economyService: EconomyService,
  ) {}

  async flip(userId: string, betAmount: number, choice: CoinSide) {
    if (betAmount < 10) throw new BadRequestException('Minimum bet is 10 coins');
    if (betAmount > 50000) throw new BadRequestException('Maximum bet is 50,000 coins');

    await this.economyService.debit(
      userId,
      betAmount,
      TransactionType.GAME_BET,
      'Coinflip bet',
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
      metadata: { choice, result, won },
    });
    await this.roundRepo.save(round);

    if (won) {
      await this.economyService.credit(
        userId,
        payout,
        TransactionType.GAME_WIN,
        'Coinflip win',
        round.id,
      );
    }

    return { won, result, choice, payout, betAmount };
  }

  async getHistory(userId: string, limit = 20) {
    return this.roundRepo.find({
      where: { userId, type: GameType.COINFLIP },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
