import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem, ItemStatus } from '../../inventory/entities/inventory-item.entity';
import { ItemRarity } from '../../cases/entities/case-item.entity';
import { EconomyService } from '../../economy/economy.service';
import { TransactionType } from '../../economy/entities/transaction.entity';

const RARITY_ORDER = [
  ItemRarity.COMMON,
  ItemRarity.UNCOMMON,
  ItemRarity.RARE,
  ItemRarity.EPIC,
  ItemRarity.LEGENDARY,
  ItemRarity.MYTHIC,
];

@Injectable()
export class UpgradeService {
  constructor(
    @InjectRepository(InventoryItem) private readonly itemRepo: Repository<InventoryItem>,
    private readonly economyService: EconomyService,
  ) {}

  calculateSuccessChance(itemValue: number, targetValue: number): number {
    if (targetValue <= itemValue) return 0;
    const ratio = itemValue / targetValue;
    return Math.max(0.05, Math.min(0.95, ratio * 0.9));
  }

  async upgradeItem(userId: string, itemId: string, targetItemId: string) {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.userId !== userId) throw new ForbiddenException('Not your item');
    if (item.status !== ItemStatus.ACTIVE) throw new BadRequestException('Item not available');

    const targetItem = await this.itemRepo.findOne({ where: { id: targetItemId, userId } });
    if (!targetItem) throw new NotFoundException('Target item not found');
    if (targetItem.status !== ItemStatus.ACTIVE) throw new BadRequestException('Target item not available');

    const itemValue = Number(item.value);
    const targetValue = Number(targetItem.value);

    if (targetValue <= itemValue) {
      throw new BadRequestException('Target item must be worth more than source item');
    }

    const successChance = this.calculateSuccessChance(itemValue, targetValue);
    const won = Math.random() < successChance;

    if (won) {
      item.status = ItemStatus.UPGRADED;
      await this.itemRepo.save(item);
      targetItem.value = targetValue;
      return { won: true, item: targetItem, successChance, targetValue };
    } else {
      item.status = ItemStatus.UPGRADED;
      await this.itemRepo.save(item);
      targetItem.status = ItemStatus.UPGRADED;
      await this.itemRepo.save(targetItem);
      return { won: false, successChance, itemValue, targetValue };
    }
  }

  async getUpgradeTargets(userId: string, itemId: string) {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.userId !== userId) throw new ForbiddenException('Not your item');

    const itemValue = Number(item.value);
    const targets = await this.itemRepo.find({
      where: { userId, status: ItemStatus.ACTIVE },
    });

    return targets
      .filter((t) => t.id !== itemId && Number(t.value) > itemValue)
      .map((t) => ({
        ...t,
        successChance: this.calculateSuccessChance(itemValue, Number(t.value)),
      }))
      .sort((a, b) => a.successChance - b.successChance);
  }
}
