import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, Index,
} from 'typeorm';

export enum VipTier {
  NONE = 'none',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

export const VIP_THRESHOLDS: Record<VipTier, number> = {
  [VipTier.NONE]: 0,
  [VipTier.BRONZE]: 10_000,
  [VipTier.SILVER]: 50_000,
  [VipTier.GOLD]: 200_000,
  [VipTier.PLATINUM]: 1_000_000,
  [VipTier.DIAMOND]: 5_000_000,
};

export const VIP_BENEFITS: Record<VipTier, {
  dailyBonusMultiplier: number;
  caseDiscountPercent: number;
  xpMultiplier: number;
  exclusiveCases: boolean;
  prioritySupport: boolean;
  badge: string;
}> = {
  [VipTier.NONE]: { dailyBonusMultiplier: 1, caseDiscountPercent: 0, xpMultiplier: 1, exclusiveCases: false, prioritySupport: false, badge: '' },
  [VipTier.BRONZE]: { dailyBonusMultiplier: 1.1, caseDiscountPercent: 2, xpMultiplier: 1.1, exclusiveCases: false, prioritySupport: false, badge: '🥉' },
  [VipTier.SILVER]: { dailyBonusMultiplier: 1.25, caseDiscountPercent: 5, xpMultiplier: 1.25, exclusiveCases: false, prioritySupport: false, badge: '🥈' },
  [VipTier.GOLD]: { dailyBonusMultiplier: 1.5, caseDiscountPercent: 10, xpMultiplier: 1.5, exclusiveCases: true, prioritySupport: false, badge: '🥇' },
  [VipTier.PLATINUM]: { dailyBonusMultiplier: 2, caseDiscountPercent: 15, xpMultiplier: 2, exclusiveCases: true, prioritySupport: true, badge: '💎' },
  [VipTier.DIAMOND]: { dailyBonusMultiplier: 3, caseDiscountPercent: 20, xpMultiplier: 3, exclusiveCases: true, prioritySupport: true, badge: '👑' },
};

@Entity('vip_status')
@Index(['userId'], { unique: true })
export class VipStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ type: 'enum', enum: VipTier, default: VipTier.NONE })
  tier: VipTier;

  @Column({ name: 'total_wagered', type: 'bigint', default: 0 })
  totalWagered: number;

  @Column({ name: 'next_tier_threshold', type: 'bigint', default: 10000 })
  nextTierThreshold: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
