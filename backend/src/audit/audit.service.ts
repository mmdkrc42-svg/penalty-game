import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';

interface AuditOptions {
  userId?: string;
  action: AuditAction;
  ip?: string;
  userAgent?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  metadata?: Record<string, any>;
  referenceId?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>,
  ) {}

  async log(opts: AuditOptions): Promise<void> {
    try {
      const entry = this.repo.create(opts);
      await this.repo.save(entry);
    } catch {
      // Audit failures must never break business logic
    }
  }

  async getUserLogs(userId: string, limit = 50, offset = 0) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getByAction(action: AuditAction, limit = 100) {
    return this.repo.find({
      where: { action },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getSuspiciousActivity(since?: Date) {
    const qb = this.repo.createQueryBuilder('al')
      .where('al.action = :action', { action: AuditAction.SUSPICIOUS_ACTIVITY })
      .orderBy('al.createdAt', 'DESC')
      .take(200);

    if (since) qb.andWhere('al.createdAt >= :since', { since });
    return qb.getMany();
  }
}
