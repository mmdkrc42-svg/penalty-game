import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../database/database.module';
import { AppLogger } from '../common/logger/app-logger.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { GameRound } from '../games/entities/game-round.entity';

interface BetVelocityResult {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class AntiFraudService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(GameRound) private readonly gameRepo: Repository<GameRound>,
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
    private readonly auditService: AuditService,
  ) {
    this.logger.setContext('AntiFraudService');
  }

  // Check if user is placing bets too rapidly
  async checkBetVelocity(userId: string, ip: string): Promise<BetVelocityResult> {
    const userKey = `fraud:bets:user:${userId}`;
    const ipKey = `fraud:bets:ip:${ip}`;

    const [userBets, ipBets] = await Promise.all([
      this.redis.incr(userKey),
      this.redis.incr(ipKey),
    ]);

    // Set TTL on first increment
    if (userBets === 1) await this.redis.expire(userKey, 60);
    if (ipBets === 1) await this.redis.expire(ipKey, 60);

    if (userBets > 30) {
      await this.flagSuspicious(userId, ip, 'bet_velocity_user', { userBets });
      return { allowed: false, reason: 'Too many bets per minute. Please slow down.' };
    }

    if (ipBets > 60) {
      await this.flagSuspicious(userId, ip, 'bet_velocity_ip', { ipBets });
      return { allowed: false, reason: 'Rate limit exceeded from this IP.' };
    }

    return { allowed: true };
  }

  // Detect suspicious win patterns
  async checkWinPattern(userId: string): Promise<{ suspicious: boolean; winRate: number }> {
    const recentRounds = await this.gameRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    if (recentRounds.length < 10) return { suspicious: false, winRate: 0 };

    const wins = recentRounds.filter((r) => r.result === 'win').length;
    const winRate = wins / recentRounds.length;

    if (winRate > 0.85) {
      this.logger.warn(`Suspicious win rate detected`, { userId, winRate, samples: recentRounds.length });
      await this.flagSuspicious(userId, null, 'suspicious_win_rate', { winRate, samples: recentRounds.length });
      return { suspicious: true, winRate };
    }

    return { suspicious: false, winRate };
  }

  // Detect case-opening patterns (e.g., always opening at specific times)
  async checkCaseOpeningVelocity(userId: string, ip: string): Promise<BetVelocityResult> {
    const key = `fraud:cases:${userId}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 60);

    if (count > 20) {
      await this.flagSuspicious(userId, ip, 'case_opening_velocity', { count });
      return { allowed: false, reason: 'Too many cases opened per minute.' };
    }
    return { allowed: true };
  }

  // Check if account was just created (new account abuse)
  async checkNewAccountAbuse(userId: string, createdAt: Date): Promise<void> {
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < 1) {
      const key = `fraud:new_account:${userId}`;
      const actions = await this.redis.incr(key);
      if (actions === 1) await this.redis.expire(key, 3600);
      if (actions > 10) {
        await this.flagSuspicious(userId, null, 'new_account_abuse', { ageHours, actions });
      }
    }
  }

  // Check for multiple accounts from same IP
  async checkMultipleAccounts(userId: string, ip: string): Promise<void> {
    const key = `fraud:ip_users:${ip}`;
    await this.redis.sadd(key, userId);
    await this.redis.expire(key, 86400); // 24h
    const accountCount = await this.redis.scard(key);

    if (accountCount > 5) {
      this.logger.warn(`Multiple accounts from same IP`, { ip, accountCount });
      await this.flagSuspicious(userId, ip, 'multiple_accounts_ip', { accountCount });
    }
  }

  private async flagSuspicious(
    userId: string | null,
    ip: string | null,
    reason: string,
    metadata: Record<string, any>,
  ) {
    this.logger.warn(`Suspicious activity flagged`, { userId, ip, reason, ...metadata });
    await this.auditService.log({
      userId,
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      ip,
      metadata: { reason, ...metadata },
    });

    // Increment suspicion score
    if (userId) {
      const scoreKey = `fraud:score:${userId}`;
      const score = await this.redis.incr(scoreKey);
      await this.redis.expire(scoreKey, 86400);

      if (score >= 10) {
        this.logger.error(`User ${userId} has high fraud score: ${score}`);
        // Auto-flag for review (could trigger admin notification)
        await this.redis.set(`fraud:review:${userId}`, '1', 'EX', 86400 * 7);
      }
    }
  }

  async getFraudScore(userId: string): Promise<number> {
    const score = await this.redis.get(`fraud:score:${userId}`);
    return parseInt(score || '0', 10);
  }

  async isUnderReview(userId: string): Promise<boolean> {
    const flag = await this.redis.get(`fraud:review:${userId}`);
    return flag === '1';
  }

  async clearFraudFlags(userId: string): Promise<void> {
    await Promise.all([
      this.redis.del(`fraud:score:${userId}`),
      this.redis.del(`fraud:review:${userId}`),
    ]);
  }
}
