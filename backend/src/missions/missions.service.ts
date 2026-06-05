import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import Redis from 'ioredis';
import {
  UserMission, MissionType, MissionStatus,
  DAILY_MISSIONS, WEEKLY_MISSIONS, MissionTemplate,
} from './mission.entity';
import { REDIS_CLIENT } from '../database/database.module';
import { EconomyService } from '../economy/economy.service';
import { TransactionType } from '../economy/entities/transaction.entity';
import { AppLogger } from '../common/logger/app-logger.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { InjectRepository as IR2 } from '@nestjs/typeorm';

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(UserMission) private readonly missionRepo: Repository<UserMission>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly economyService: EconomyService,
    private readonly auditService: AuditService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('MissionsService');
  }

  async ensureDailyMissions(userId: string): Promise<UserMission[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);

    const existing = await this.missionRepo.find({
      where: { userId, type: MissionType.DAILY, expiresAt: MoreThan(todayStart) },
    });

    if (existing.length > 0) return existing;

    // Assign 3 random daily missions
    const selected = this.shuffleArray([...DAILY_MISSIONS]).slice(0, 3);
    const missions = selected.map((t) =>
      this.missionRepo.create({
        userId,
        templateId: t.id,
        type: t.type,
        title: t.title,
        description: t.description,
        icon: t.icon,
        target: t.target,
        criteriaType: t.criteriaType,
        xpReward: t.xpReward,
        coinReward: t.coinReward,
        expiresAt: tomorrowStart,
        status: MissionStatus.ACTIVE,
      }),
    );

    return this.missionRepo.save(missions);
  }

  async ensureWeeklyMissions(userId: string): Promise<UserMission[]> {
    const now = new Date();
    const monday = this.getMonday(now);
    const nextMonday = new Date(monday.getTime() + 7 * 86400000);

    const existing = await this.missionRepo.find({
      where: { userId, type: MissionType.WEEKLY, expiresAt: MoreThan(monday) },
    });

    if (existing.length > 0) return existing;

    const missions = WEEKLY_MISSIONS.map((t) =>
      this.missionRepo.create({
        userId,
        templateId: t.id,
        type: t.type,
        title: t.title,
        description: t.description,
        icon: t.icon,
        target: t.target,
        criteriaType: t.criteriaType,
        xpReward: t.xpReward,
        coinReward: t.coinReward,
        expiresAt: nextMonday,
        status: MissionStatus.ACTIVE,
      }),
    );

    return this.missionRepo.save(missions);
  }

  async getUserMissions(userId: string) {
    const [daily, weekly] = await Promise.all([
      this.ensureDailyMissions(userId),
      this.ensureWeeklyMissions(userId),
    ]);
    return { daily, weekly };
  }

  async updateProgress(userId: string, criteriaType: string, amount: number): Promise<UserMission[]> {
    const now = new Date();
    const activeMissions = await this.missionRepo.find({
      where: {
        userId,
        criteriaType,
        status: MissionStatus.ACTIVE,
        expiresAt: MoreThan(now),
      },
    });

    const completed: UserMission[] = [];
    for (const mission of activeMissions) {
      mission.progress = Math.min(mission.progress + amount, mission.target);
      if (mission.progress >= mission.target) {
        mission.status = MissionStatus.COMPLETED;
        completed.push(mission);
      }
      await this.missionRepo.save(mission);
    }

    return completed;
  }

  async claimMission(userId: string, missionId: string) {
    const mission = await this.missionRepo.findOne({ where: { id: missionId, userId } });
    if (!mission) throw new Error('Mission not found');
    if (mission.status !== MissionStatus.COMPLETED) throw new Error('Mission not completed');

    mission.status = MissionStatus.CLAIMED;
    await this.missionRepo.save(mission);

    await this.economyService.credit(
      userId, Number(mission.coinReward), TransactionType.DAILY_REWARD,
      `Mission: ${mission.title}`, missionId,
    );
    await this.userRepo.increment({ id: userId }, 'xp', mission.xpReward);

    await this.auditService.log({
      userId,
      action: AuditAction.MISSION_COMPLETED,
      referenceId: missionId,
      metadata: { title: mission.title, coinReward: mission.coinReward, xpReward: mission.xpReward },
    });

    return { mission, coinsEarned: Number(mission.coinReward), xpEarned: mission.xpReward };
  }

  // Expire stale missions
  async expireMissions(): Promise<number> {
    const result = await this.missionRepo.update(
      { status: MissionStatus.ACTIVE, expiresAt: LessThan(new Date()) },
      { status: MissionStatus.EXPIRED },
    );
    return result.affected || 0;
  }

  private shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
