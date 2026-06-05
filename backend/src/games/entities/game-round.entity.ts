import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum GameType {
  CRASH = 'crash',
  COINFLIP = 'coinflip',
  UPGRADE = 'upgrade',
}

export enum GameResult {
  WIN = 'win',
  LOSS = 'loss',
  CANCELLED = 'cancelled',
}

@Entity('game_rounds')
export class GameRound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: GameType,
  })
  type: GameType;

  @Column({ type: 'bigint' })
  betAmount: number;

  @Column({ name: 'payout_amount', type: 'bigint', default: 0 })
  payoutAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  multiplier: number;

  @Column({
    type: 'enum',
    enum: GameResult,
    nullable: true,
  })
  result: GameResult;

  @Column({ name: 'crash_point', type: 'decimal', precision: 10, scale: 4, nullable: true })
  crashPoint: number;

  @Column({ name: 'cash_out_at', type: 'decimal', precision: 10, scale: 4, nullable: true })
  cashOutAt: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
