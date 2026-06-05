import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../economy/entities/wallet.entity';
import { REDIS_CLIENT } from '../database/database.module';
import Redis from 'ioredis';

const CACHE_TTL = 300;

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getTopPlayers(limit = 50): Promise<any[]> {
    const cacheKey = `leaderboard:top:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const users = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.wallet', 'wallet')
      .where('user.isBanned = false')
      .orderBy('user.totalEarned', 'DESC')
      .take(limit)
      .getMany();

    const result = users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username || u.firstName || 'Anonymous',
      photoUrl: u.photoUrl,
      level: u.level,
      totalEarned: u.totalEarned,
      totalCasesOpened: u.totalCasesOpened,
      balance: u.wallet?.balance || 0,
    }));

    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
  }

  async getTopCaseOpeners(limit = 50): Promise<any[]> {
    const cacheKey = `leaderboard:cases:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const users = await this.userRepo
      .createQueryBuilder('user')
      .where('user.isBanned = false')
      .orderBy('user.totalCasesOpened', 'DESC')
      .take(limit)
      .getMany();

    const result = users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username || u.firstName || 'Anonymous',
      photoUrl: u.photoUrl,
      level: u.level,
      totalCasesOpened: u.totalCasesOpened,
    }));

    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
  }

  async getRichestPlayers(limit = 50): Promise<any[]> {
    const cacheKey = `leaderboard:rich:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const wallets = await this.walletRepo
      .createQueryBuilder('wallet')
      .leftJoinAndSelect('wallet.user', 'user')
      .where('user.isBanned = false')
      .orderBy('wallet.balance', 'DESC')
      .take(limit)
      .getMany();

    const result = wallets.map((w, i) => ({
      rank: i + 1,
      userId: w.userId,
      username: w.user?.username || w.user?.firstName || 'Anonymous',
      photoUrl: w.user?.photoUrl,
      level: w.user?.level,
      balance: w.balance,
    }));

    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
  }

  async getUserRank(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });
    if (!user) return null;

    const [earnerRank, casesRank] = await Promise.all([
      this.userRepo.count({
        where: { isBanned: false },
      }).then(async () => {
        const count = await this.userRepo
          .createQueryBuilder('u')
          .where('u.totalEarned > :earned', { earned: user.totalEarned })
          .andWhere('u.isBanned = false')
          .getCount();
        return count + 1;
      }),
      this.userRepo
        .createQueryBuilder('u')
        .where('u.totalCasesOpened > :count', { count: user.totalCasesOpened })
        .andWhere('u.isBanned = false')
        .getCount()
        .then((c) => c + 1),
    ]);

    return {
      userId,
      earnerRank,
      casesRank,
      totalEarned: user.totalEarned,
      totalCasesOpened: user.totalCasesOpened,
      balance: user.wallet?.balance || 0,
    };
  }
}
