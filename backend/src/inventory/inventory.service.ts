import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem, ItemStatus } from './entities/inventory-item.entity';
import { EconomyService } from '../economy/economy.service';
import { TransactionType } from '../economy/entities/transaction.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem) private readonly itemRepo: Repository<InventoryItem>,
    private readonly economyService: EconomyService,
  ) {}

  async getUserInventory(userId: string, status?: ItemStatus) {
    const where: any = { userId };
    if (status) where.status = status;

    const [items, total] = await this.itemRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
    });

    const totalValue = items
      .filter((i) => i.status === ItemStatus.ACTIVE)
      .reduce((sum, i) => sum + Number(i.value), 0);

    return { items, total, totalValue };
  }

  async sellItem(userId: string, itemId: string): Promise<{ item: InventoryItem; coinsEarned: number }> {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.userId !== userId) throw new ForbiddenException('Not your item');
    if (item.status !== ItemStatus.ACTIVE) throw new ForbiddenException('Item already sold or used');

    const sellValue = Math.floor(Number(item.value) * 0.85);
    item.status = ItemStatus.SOLD;
    item.soldFor = sellValue;
    await this.itemRepo.save(item);

    await this.economyService.credit(
      userId,
      sellValue,
      TransactionType.ITEM_SELL,
      `Sold item: ${item.name}`,
      itemId,
    );

    return { item, coinsEarned: sellValue };
  }

  async sellMultiple(userId: string, itemIds: string[]): Promise<{ totalCoins: number; soldCount: number }> {
    let totalCoins = 0;
    let soldCount = 0;

    for (const itemId of itemIds) {
      try {
        const { coinsEarned } = await this.sellItem(userId, itemId);
        totalCoins += coinsEarned;
        soldCount++;
      } catch {}
    }

    return { totalCoins, soldCount };
  }

  async getItem(itemId: string, userId: string): Promise<InventoryItem> {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.userId !== userId) throw new ForbiddenException('Not your item');
    return item;
  }
}
