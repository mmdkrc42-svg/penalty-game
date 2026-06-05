import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Wallet } from '../economy/entities/wallet.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    private readonly configService: ConfigService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['wallet'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });
    if (!user) throw new NotFoundException('User not found');

    const nextLevelXp = this.calculateNextLevelXp(user.level);
    return {
      ...user,
      nextLevelXp,
      xpProgress: Number(user.xp) / nextLevelXp,
    };
  }

  async claimDailyReward(userId: string) {
    const user = await this.findById(userId);
    const now = new Date();
    const lastClaim = user.lastDailyClaim;

    const hoursSinceLastClaim = lastClaim
      ? (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (hoursSinceLastClaim < 20) {
      const nextClaimAt = new Date(lastClaim.getTime() + 20 * 60 * 60 * 1000);
      return { canClaim: false, nextClaimAt };
    }

    const isConsecutiveDay = hoursSinceLastClaim < 48;
    const newStreak = isConsecutiveDay ? user.dailyStreak + 1 : 1;
    const baseReward = this.configService.get<number>('economy.dailyRewardBase', 100);
    const streakMultiplier = Math.min(newStreak, 7);
    const reward = baseReward * streakMultiplier;

    const wallet = await this.walletRepo.findOne({ where: { userId } });
    wallet.balance = Number(wallet.balance) + reward;
    await this.walletRepo.save(wallet);

    user.lastDailyClaim = now;
    user.dailyStreak = newStreak;
    user.xp = Number(user.xp) + Math.floor(reward * 0.1);
    await this.checkLevelUp(user);
    await this.userRepo.save(user);

    return {
      canClaim: true,
      reward,
      streak: newStreak,
      nextClaimAt: new Date(now.getTime() + 20 * 60 * 60 * 1000),
    };
  }

  async checkLevelUp(user: User) {
    let nextLevelXp = this.calculateNextLevelXp(user.level);
    while (Number(user.xp) >= nextLevelXp) {
      user.level += 1;
      nextLevelXp = this.calculateNextLevelXp(user.level);
    }
    return user;
  }

  calculateNextLevelXp(level: number): number {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  async getStats(userId: string) {
    const user = await this.findById(userId);
    return {
      totalCasesOpened: user.totalCasesOpened,
      totalSpent: user.totalSpent,
      totalEarned: user.totalEarned,
      level: user.level,
      xp: user.xp,
      dailyStreak: user.dailyStreak,
    };
  }
}
