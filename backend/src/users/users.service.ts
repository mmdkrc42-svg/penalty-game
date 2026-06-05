import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Wallet } from '../economy/entities/wallet.entity';
import { Transaction, TransactionType } from '../economy/entities/transaction.entity';
import { AchievementsService } from '../achievements/achievements.service';
import { MissionsService } from '../missions/missions.service';
import { EventsGateway } from '../websocket/events.gateway';
import { AppLogger } from '../common/logger/app-logger.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly achievementsService: AchievementsService,
    private readonly missionsService: MissionsService,
    private readonly eventsGateway: EventsGateway,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('UsersService');
  }

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
    return this.dataSource.transaction(async (manager) => {
      const user = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.id = :userId', { userId })
        .setLock('pessimistic_write')
        .getOne();

      if (!user) throw new NotFoundException('User not found');

      const now = new Date();
      const hoursSinceLastClaim = user.lastDailyClaim
        ? (now.getTime() - user.lastDailyClaim.getTime()) / (1000 * 60 * 60)
        : Infinity;

      if (hoursSinceLastClaim < 20) {
        const nextClaimAt = new Date(user.lastDailyClaim.getTime() + 20 * 60 * 60 * 1000);
        return { canClaim: false, nextClaimAt };
      }

      const isConsecutiveDay = hoursSinceLastClaim < 48;
      const newStreak = isConsecutiveDay ? user.dailyStreak + 1 : 1;
      const baseReward = this.configService.get<number>('economy.dailyRewardBase', 100);
      const streakMultiplier = Math.min(newStreak, 7);
      const reward = baseReward * streakMultiplier;

      const wallet = await manager
        .getRepository(Wallet)
        .createQueryBuilder('w')
        .where('w.userId = :userId', { userId })
        .setLock('pessimistic_write')
        .getOne();

      wallet.balance = Number(wallet.balance) + reward;
      wallet.totalDeposited = Number(wallet.totalDeposited) + reward;
      await manager.save(wallet);

      const tx = manager.getRepository(Transaction).create({
        walletId: wallet.id,
        userId,
        type: TransactionType.DAILY_REWARD,
        amount: reward,
        balanceBefore: Number(wallet.balance) - reward,
        balanceAfter: Number(wallet.balance),
        description: `Daily reward (streak ${newStreak})`,
      });
      await manager.save(tx);

      user.lastDailyClaim = now;
      user.dailyStreak = newStreak;
      user.xp = Number(user.xp) + Math.floor(reward * 0.1);
      await this.checkLevelUp(user);
      await manager.save(user);

      // Side effects after transaction commits
      setImmediate(() => {
        this.eventsGateway.emitBalanceUpdate(userId, Number(wallet.balance));
        this.achievementsService.triggerStreakCheck(userId, newStreak).catch(() => {});
        this.missionsService.updateProgress(userId, 'daily_login', 1).catch(() => {});
      });

      this.logger.log('Daily reward claimed', { userId, reward, streak: newStreak });
      return {
        canClaim: true,
        reward,
        streak: newStreak,
        nextClaimAt: new Date(now.getTime() + 20 * 60 * 60 * 1000),
      };
    });
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
