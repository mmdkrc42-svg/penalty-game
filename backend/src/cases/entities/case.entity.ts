import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CaseItem } from './case-item.entity';

export enum CaseCategory {
  STARTER = 'starter',
  PREMIUM = 'premium',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  LIMITED = 'limited',
  EVENT = 'event',
}

@Entity('cases')
export class Case {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ type: 'bigint' })
  price: number;

  @Column({
    type: 'enum',
    enum: CaseCategory,
    default: CaseCategory.STARTER,
  })
  category: CaseCategory;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'total_opened', default: 0 })
  totalOpened: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CaseItem, (item) => item.case, { cascade: true, eager: true })
  items: CaseItem[];
}
