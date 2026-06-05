import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VipStatus, VipTier, VIP_THRESHOLDS, VIP_BENEFITS } from './vip.entity';
import { AppLogger } from '../common/logger/app-logger.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

const TIER_ORDER = [
  VipTier.NONE,
  VipTier.BRONZE,
  VipTier.SILVER,
  VipTier.GOLD,
  VipTier.PLATINUM,
  VipTier.DIAMOND,
];

@Injectable()
export class VipService {
  constructor(
    @InjectRepository(VipStatus) private readonly repo: Repository<VipStatus>,
    private readonly logger: AppLogger,
    private readonly auditService: AuditService,
  ) {
    this.logger.setContext('VipService');
  }

  async getOrCreate(userId: string): Promise<VipStatus> {
    let vip = await this.repo.findOne({ where: { userId } });
    if (!vip) {
      vip = this.repo.create({ userId, tier: VipTier.NONE, totalWagered: 0, nextTierThreshold: VIP_THRESHOLDS[VipTier.BRONZE] });
      vip = await this.repo.save(vip);
    }
    return vip;
  }

  async addWager(userId: string, amount: number): Promise<{ vip: VipStatus; promoted: boolean; newTier?: VipTier }> {
    const vip = await this.getOrCreate(userId);
    const oldTier = vip.tier;

    vip.totalWagered = Number(vip.totalWagered) + amount;
    const newTier = this.calculateTier(vip.totalWagered);
    vip.tier = newTier;

    const currentIdx = TIER_ORDER.indexOf(newTier);
    const nextTier = TIER_ORDER[currentIdx + 1];
    vip.nextTierThreshold = nextTier ? VIP_THRESHOLDS[nextTier] : VIP_THRESHOLDS[VipTier.DIAMOND];

    await this.repo.save(vip);

    const promoted = oldTier !== newTier;
    if (promoted) {
      this.logger.log('VIP tier upgraded', { userId, from: oldTier, to: newTier });
      await this.auditService.log({
        userId,
        action: AuditAction.VIP_UPGRADED,
        before: { tier: oldTier },
        after: { tier: newTier },
        metadata: { totalWagered: vip.totalWagered },
      });
    }

    return { vip, promoted, newTier: promoted ? newTier : undefined };
  }

  async getStatus(userId: string) {
    const vip = await this.getOrCreate(userId);
    const benefits = VIP_BENEFITS[vip.tier];
    const currentIdx = TIER_ORDER.indexOf(vip.tier);
    const nextTier = TIER_ORDER[currentIdx + 1];
    const progress = nextTier
      ? Math.min((Number(vip.totalWagered) / VIP_THRESHOLDS[nextTier]) * 100, 100)
      : 100;

    return {
      tier: vip.tier,
      totalWagered: vip.totalWagered,
      benefits,
      nextTier: nextTier || null,
      nextTierThreshold: nextTier ? VIP_THRESHOLDS[nextTier] : null,
      progress,
    };
  }

  getBenefits(tier: VipTier) {
    return VIP_BENEFITS[tier] || VIP_BENEFITS[VipTier.NONE];
  }

  private calculateTier(wagered: number): VipTier {
    const tiers = [...TIER_ORDER].reverse();
    for (const tier of tiers) {
      if (wagered >= VIP_THRESHOLDS[tier]) return tier;
    }
    return VipTier.NONE;
  }
}
