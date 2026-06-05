import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum MissionType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  SPECIAL = 'special',
}

export enum MissionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CLAIMED = 'claimed',
  EXPIRED = 'expired',
}

export interface MissionTemplate {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  icon: string;
  target: number;
  criteriaType: string;
  xpReward: number;
  coinReward: number;
}

export const DAILY_MISSIONS: MissionTemplate[] = [
  { id: 'daily_open_3', type: MissionType.DAILY, title: 'Case Rush', description: 'Open 3 cases', icon: '📦', target: 3, criteriaType: 'cases_opened', xpReward: 50, coinReward: 150 },
  { id: 'daily_earn_500', type: MissionType.DAILY, title: 'Coin Collector', description: 'Earn 500 coins', icon: '💰', target: 500, criteriaType: 'coins_earned', xpReward: 30, coinReward: 100 },
  { id: 'daily_game_3', type: MissionType.DAILY, title: 'Play 3 Games', description: 'Play 3 mini-games', icon: '🎮', target: 3, criteriaType: 'games_played', xpReward: 40, coinReward: 120 },
  { id: 'daily_sell_5', type: MissionType.DAILY, title: 'Clear Inventory', description: 'Sell 5 items', icon: '🛒', target: 5, criteriaType: 'items_sold', xpReward: 35, coinReward: 100 },
  { id: 'daily_flip_2', type: MissionType.DAILY, title: 'Heads or Tails', description: 'Play 2 coinflips', icon: '🪙', target: 2, criteriaType: 'coinflips_played', xpReward: 25, coinReward: 75 },
];

export const WEEKLY_MISSIONS: MissionTemplate[] = [
  { id: 'weekly_open_20', type: MissionType.WEEKLY, title: 'Case Maniac', description: 'Open 20 cases this week', icon: '📦', target: 20, criteriaType: 'cases_opened', xpReward: 500, coinReward: 2000 },
  { id: 'weekly_earn_5k', type: MissionType.WEEKLY, title: 'High Roller', description: 'Earn 5,000 coins this week', icon: '💵', target: 5000, criteriaType: 'coins_earned', xpReward: 400, coinReward: 1500 },
  { id: 'weekly_games_15', type: MissionType.WEEKLY, title: 'Game Addict', description: 'Play 15 games this week', icon: '🎯', target: 15, criteriaType: 'games_played', xpReward: 350, coinReward: 1200 },
  { id: 'weekly_referral_1', type: MissionType.WEEKLY, title: 'Recruit a Friend', description: 'Refer 1 friend this week', icon: '🔗', target: 1, criteriaType: 'referrals', xpReward: 600, coinReward: 2500 },
];

@Entity('user_missions')
@Index(['userId', 'status'])
@Index(['userId', 'expiresAt'])
export class UserMission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @Column({ type: 'enum', enum: MissionType })
  type: MissionType;

  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'description' })
  description: string;

  @Column({ name: 'icon' })
  icon: string;

  @Column({ name: 'target', type: 'int' })
  target: number;

  @Column({ name: 'progress', type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'criteria_type' })
  criteriaType: string;

  @Column({ name: 'xp_reward', default: 0 })
  xpReward: number;

  @Column({ name: 'coin_reward', type: 'bigint', default: 0 })
  coinReward: number;

  @Column({ type: 'enum', enum: MissionStatus, default: MissionStatus.ACTIVE })
  status: MissionStatus;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
