import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum AuditAction {
  USER_LOGIN = 'user.login',
  USER_REGISTER = 'user.register',
  USER_BANNED = 'user.banned',
  USER_UNBANNED = 'user.unbanned',
  CASE_OPENED = 'case.opened',
  ITEM_SOLD = 'item.sold',
  ITEMS_SOLD_BULK = 'item.sold_bulk',
  GAME_BET = 'game.bet',
  GAME_WIN = 'game.win',
  GAME_LOSS = 'game.loss',
  DAILY_CLAIMED = 'daily.claimed',
  REFERRAL_CREATED = 'referral.created',
  BALANCE_ADJUSTED = 'balance.adjusted',
  ITEM_UPGRADED = 'item.upgraded',
  LEVEL_UP = 'user.level_up',
  ACHIEVEMENT_UNLOCKED = 'achievement.unlocked',
  MISSION_COMPLETED = 'mission.completed',
  VIP_UPGRADED = 'vip.upgraded',
  PRESTIGE = 'user.prestige',
  SUSPICIOUS_ACTIVITY = 'security.suspicious',
  RATE_LIMIT_HIT = 'security.rate_limit',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ nullable: true })
  ip: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
