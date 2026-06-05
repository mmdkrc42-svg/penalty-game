import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Wallet } from '../../economy/entities/wallet.entity';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';
import { Referral } from '../../referrals/entities/referral.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'telegram_id', type: 'bigint' })
  telegramId: number;

  @Column({ nullable: true })
  username: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ name: 'photo_url', nullable: true })
  photoUrl: string;

  @Column({ name: 'language_code', default: 'en' })
  languageCode: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'is_banned', default: false })
  isBanned: boolean;

  @Column({ name: 'ban_reason', nullable: true })
  banReason: string;

  @Column({ name: 'xp', type: 'bigint', default: 0 })
  xp: number;

  @Column({ name: 'level', default: 1 })
  level: number;

  @Column({ name: 'total_cases_opened', default: 0 })
  totalCasesOpened: number;

  @Column({ name: 'total_spent', type: 'bigint', default: 0 })
  totalSpent: number;

  @Column({ name: 'total_earned', type: 'bigint', default: 0 })
  totalEarned: number;

  @Column({ name: 'referral_code', unique: true, nullable: true })
  referralCode: string;

  @Column({ name: 'referred_by', nullable: true })
  referredBy: string;

  @Column({ name: 'last_daily_claim', type: 'timestamp', nullable: true })
  lastDailyClaim: Date;

  @Column({ name: 'daily_streak', default: 0 })
  dailyStreak: number;

  @Column({ name: 'last_seen', type: 'timestamp', nullable: true })
  lastSeen: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Wallet, (wallet) => wallet.user, { cascade: true })
  wallet: Wallet;

  @OneToMany(() => InventoryItem, (item) => item.user)
  inventory: InventoryItem[];

  @OneToMany(() => Referral, (referral) => referral.referrer)
  referrals: Referral[];
}
