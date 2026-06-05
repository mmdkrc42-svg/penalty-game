import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ItemRarity } from '../../cases/entities/case-item.entity';

export enum ItemStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  UPGRADED = 'upgraded',
  USED = 'used',
}

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'case_item_id', nullable: true })
  caseItemId: string;

  @Column({ name: 'case_id', nullable: true })
  caseId: string;

  @Column()
  name: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: ItemRarity,
    default: ItemRarity.COMMON,
  })
  rarity: ItemRarity;

  @Column({ type: 'bigint' })
  value: number;

  @Column({
    type: 'enum',
    enum: ItemStatus,
    default: ItemStatus.ACTIVE,
  })
  status: ItemStatus;

  @Column({ name: 'sold_for', type: 'bigint', nullable: true })
  soldFor: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.inventory)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
