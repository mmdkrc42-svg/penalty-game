import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Redis from 'ioredis';
import {
  UserAchievement,
  AchievementDefinition,
  ACHIEVEMENT_DEFINITIONS,
} from './achievement.entity';
import { REDIS_CLIENT } from '../database/database.module';
import { AppLogger } from '../common/logger/app-logger.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { EconomyService } from '../economy/economy.service';
import { TransactionType } from '../economy/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { InjectRepository as Inject2 } from '@nestjs/typeorm';

@Injectable()
export class AchievementsService {
  private readonly definitions = new Map<string, AchievementDefinition>(
    ACHIEVEMENT_DEFINITIONS.map((d) => [d.id, d]),
  );

  constructor(
    @InjectRepository(UserAchievement) private readonly repo: Repository<UserAchievement>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly economyService: EconomyService,
    private readonly auditService: AuditService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('AchievementsService');
  }

  async getUserAchievements(userId: string) {
    const unlocked = await this.repo.find({ where: { userId }, order: { unlockedAt: 'DESC' } });
    const unlockedIds = new Set(unlocked.map((a) => a.achievementId));

    const all = ACHIEVEMENT_DEFINITIONS.filter((d) => !d.secret || unlockedIds.has(d.id)).map((def) => ({
      ...def,
      unlocked: unlockedIds.has(def.id),
      unlockedAt: unlocked.find((a) => a.achievementId === def.id)?.unlockedAt || null,
    }));

    return { achievements: all, unlockedCount: unlocked.length, totalCount: ACHIEVEMENT_DEFINITIONS.length };
  }

  async checkAndUnlock(userId: string, criteriaType: string, value: number): Promise<AchievementDefinition[]> {
    const unlocked: AchievementDefinition[] = [];

    const candidates = ACHIEVEMENT_DEFINITIONS.filter(
      (d) => d.criteria.type === criteriaType && d.criteria.value <= value,
    );

    if (candidates.length === 0) return unlocked;

    const alreadyUnlocked = await this.repo.find({
      where: { userId, achievementId: In(candidates.map((c) => c.id)) },
    });
    const alreadyUnlockedIds = new Set(alreadyUnlocked.map((a) => a.achievementId));

    for (const def of candidates) {
      if (alreadyUnlockedIds.has(def.id)) continue;

      try {
        const ua = this.repo.create({
          userId,
          achievementId: def.id,
          xpRewarded: def.xpReward,
          coinsRewarded: def.coinReward,
        });
        await this.repo.save(ua);

        // Credit rewards
        await this.economyService.credit(
          userId,
          def.coinReward,
          TransactionType.DAILY_REWARD,
          `Achievement: ${def.name}`,
          def.id,
        );

        // Add XP
        await this.userRepo.increment({ id: userId }, 'xp', def.xpReward);

        await this.auditService.log({
          userId,
          action: AuditAction.ACHIEVEMENT_UNLOCKED,
          referenceId: def.id,
          metadata: { achievementId: def.id, name: def.name, xpReward: def.xpReward, coinReward: def.coinReward },
        });

        // Cache notification
        await this.redis.lpush(
          `notifications:${userId}`,
          JSON.stringify({
            type: 'achievement',
            achievementId: def.id,
            name: def.name,
            icon: def.icon,
            xpReward: def.xpReward,
            coinReward: def.coinReward,
            timestamp: new Date().toISOString(),
          }),
        );
        await this.redis.ltrim(`notifications:${userId}`, 0, 49);
        await this.redis.expire(`notifications:${userId}`, 86400);

        unlocked.push(def);
        this.logger.log(`Achievement unlocked`, { userId, achievementId: def.id, name: def.name });
      } catch {
        // Already exists (race condition) — ignore
      }
    }

    return unlocked;
  }

  async triggerCasesCheck(userId: string, totalCases: number) {
    return this.checkAndUnlock(userId, 'cases_opened', totalCases);
  }

  async triggerRarityCheck(userId: string, rarityLevel: number) {
    return this.checkAndUnlock(userId, 'rarity_obtained', rarityLevel);
  }

  async triggerEarnedCheck(userId: string, totalEarned: number) {
    return this.checkAndUnlock(userId, 'total_earned', totalEarned);
  }

  async triggerLevelCheck(userId: string, level: number) {
    return this.checkAndUnlock(userId, 'level', level);
  }

  async triggerStreakCheck(userId: string, streak: number) {
    return this.checkAndUnlock(userId, 'daily_streak', streak);
  }

  async triggerReferralCheck(userId: string, referralCount: number) {
    return this.checkAndUnlock(userId, 'referrals', referralCount);
  }

  async triggerCrashMultiplierCheck(userId: string, multiplier: number) {
    return this.checkAndUnlock(userId, 'crash_multiplier', multiplier);
  }

  async triggerGamePlayedCheck(userId: string, gamesPlayed: number) {
    return this.checkAndUnlock(userId, 'games_played', gamesPlayed);
  }

  async triggerSoldCheck(userId: string, itemsSold: number) {
    return this.checkAndUnlock(userId, 'items_sold', itemsSold);
  }
}
