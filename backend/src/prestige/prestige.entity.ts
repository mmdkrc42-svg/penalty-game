import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('prestige_records')
@Index(['userId'])
export class PrestigeRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'int', default: 0 })
  prestigeLevel: number;

  @Column({ type: 'bigint', default: 0 })
  totalXpAtPrestige: string;

  @Column({ type: 'int', default: 0 })
  levelAtPrestige: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export const PRESTIGE_REQUIREMENTS = {
  minLevel: 50,
  xpReset: true,
  levelReset: true,
  coinBonus: 10_000,
  xpBonus: 500,
};

export const PRESTIGE_BENEFITS = (prestigeLevel: number) => ({
  xpMultiplier: 1 + prestigeLevel * 0.1,
  coinMultiplier: 1 + prestigeLevel * 0.05,
  badge: prestigeLevel >= 5 ? 'master' : prestigeLevel >= 3 ? 'veteran' : prestigeLevel >= 1 ? 'initiate' : 'none',
});
