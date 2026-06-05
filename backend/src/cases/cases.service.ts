import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Case } from './entities/case.entity';
import { CaseItem, ItemRarity } from './entities/case-item.entity';
import { InventoryItem, ItemStatus } from '../inventory/entities/inventory-item.entity';
import { EconomyService } from '../economy/economy.service';
import { UsersService } from '../users/users.service';
import { TransactionType } from '../economy/entities/transaction.entity';
import { AchievementsService } from '../achievements/achievements.service';
import { MissionsService } from '../missions/missions.service';
import { VipService } from '../vip/vip.service';
import { EventsGateway } from '../websocket/events.gateway';
import { AppLogger } from '../common/logger/app-logger.service';

const RARITY_LEVEL: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 1,
  [ItemRarity.UNCOMMON]: 2,
  [ItemRarity.RARE]: 3,
  [ItemRarity.EPIC]: 4,
  [ItemRarity.LEGENDARY]: 5,
  [ItemRarity.MYTHIC]: 6,
};

@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(Case) private readonly caseRepo: Repository<Case>,
    @InjectRepository(CaseItem) private readonly caseItemRepo: Repository<CaseItem>,
    @InjectRepository(InventoryItem) private readonly inventoryRepo: Repository<InventoryItem>,
    private readonly economyService: EconomyService,
    private readonly usersService: UsersService,
    private readonly achievementsService: AchievementsService,
    private readonly missionsService: MissionsService,
    private readonly vipService: VipService,
    private readonly eventsGateway: EventsGateway,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('CasesService');
  }

  async findAll(category?: string) {
    const qb = this.caseRepo.createQueryBuilder('case')
      .leftJoinAndSelect('case.items', 'items')
      .where('case.isActive = :active', { active: true })
      .orderBy('case.sortOrder', 'ASC');

    if (category) qb.andWhere('case.category = :category', { category });

    return qb.getMany();
  }

  async findOne(id: string): Promise<Case> {
    const c = await this.caseRepo.findOne({
      where: { id, isActive: true },
      relations: ['items'],
    });
    if (!c) throw new NotFoundException('Case not found');
    return c;
  }

  async openCase(userId: string, caseId: string): Promise<{
    item: InventoryItem;
    case: Case;
    wonValue: number;
    xpGained: number;
    newAchievements: any[];
  }> {
    const caseEntity = await this.findOne(caseId);
    const activeItems = caseEntity.items.filter((i) => i.active);

    if (activeItems.length === 0) {
      throw new BadRequestException('Case has no active items');
    }

    const { wallet } = await this.economyService.debit(
      userId,
      Number(caseEntity.price),
      TransactionType.CASE_OPEN,
      `Opened case: ${caseEntity.name}`,
      caseId,
    );

    const wonItem = this.weightedRandom(activeItems);

    const inventoryItem = this.inventoryRepo.create({
      userId,
      caseItemId: wonItem.id,
      caseId,
      name: wonItem.name,
      imageUrl: wonItem.imageUrl,
      rarity: wonItem.rarity,
      value: wonItem.value,
      status: ItemStatus.ACTIVE,
      metadata: { caseName: caseEntity.name },
    });
    await this.inventoryRepo.save(inventoryItem);

    await this.caseRepo.increment({ id: caseId }, 'totalOpened', 1);

    const user = await this.usersService.findById(userId);
    const xpGained = Math.max(10, Math.floor(Number(caseEntity.price) * 0.01));
    user.xp = Number(user.xp) + xpGained;
    user.totalCasesOpened += 1;
    await this.usersService.checkLevelUp(user);

    this.logger.debug('Case opened', { userId, caseId, item: wonItem.name, rarity: wonItem.rarity });

    // Fire-and-forget integrations — never throw on these
    const newAchievements = await this.runPostOpenSideEffects(
      userId,
      user,
      caseEntity.price,
      wonItem,
      wallet.balance,
    ).catch((err) => {
      this.logger.error('Post-open side effects failed', err);
      return [];
    });

    return {
      item: inventoryItem,
      case: caseEntity,
      wonValue: Number(wonItem.value),
      xpGained,
      newAchievements,
    };
  }

  private async runPostOpenSideEffects(
    userId: string,
    user: any,
    casePrice: number | bigint,
    wonItem: CaseItem,
    newBalance: number | bigint,
  ) {
    const price = Number(casePrice);

    await Promise.allSettled([
      this.missionsService.updateProgress(userId, 'cases_opened', 1),
      this.missionsService.updateProgress(userId, 'coins_spent', price),
    ]);

    const { vip, promoted, newTier } = await this.vipService.addWager(userId, price);
    if (promoted && newTier) {
      this.eventsGateway.emitVipUpgrade(userId, { tier: newTier, benefits: this.vipService.getBenefits(newTier) });
    }

    const newAchievements = await this.achievementsService.triggerCasesCheck(userId, user.totalCasesOpened);
    const rarityLevel = RARITY_LEVEL[wonItem.rarity] || 1;
    await this.achievementsService.triggerRarityCheck(userId, rarityLevel);

    this.eventsGateway.emitBalanceUpdate(userId, Number(newBalance));

    return newAchievements;
  }

  private weightedRandom(items: CaseItem[]): CaseItem {
    const totalWeight = items.reduce((sum, item) => sum + Number(item.probability), 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
      random -= Number(item.probability);
      if (random <= 0) return item;
    }
    return items[items.length - 1];
  }

  async getCaseStats(caseId: string) {
    const c = await this.caseRepo.findOne({ where: { id: caseId }, relations: ['items'] });
    if (!c) throw new NotFoundException('Case not found');

    const totalWeight = c.items.reduce((s, i) => s + Number(i.probability), 0);
    const itemsWithChance = c.items.map((item) => ({
      ...item,
      chance: ((Number(item.probability) / totalWeight) * 100).toFixed(4),
    }));

    return { ...c, items: itemsWithChance };
  }
}
