import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PrestigeRecord, PRESTIGE_REQUIREMENTS, PRESTIGE_BENEFITS } from './prestige.entity';
import { User } from '../users/entities/user.entity';
import { EconomyService } from '../economy/economy.service';
import { TransactionType } from '../economy/entities/transaction.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { EventsGateway } from '../websocket/events.gateway';
import { AppLogger } from '../common/logger/app-logger.service';

@Injectable()
export class PrestigeService {
  constructor(
    @InjectRepository(PrestigeRecord) private readonly prestigeRepo: Repository<PrestigeRecord>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly economyService: EconomyService,
    private readonly auditService: AuditService,
    private readonly eventsGateway: EventsGateway,
    private readonly dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('PrestigeService');
  }

  async getStatus(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const records = await this.prestigeRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const currentPrestige = records.length;
    const benefits = PRESTIGE_BENEFITS(currentPrestige);
    const canPrestige = user.level >= PRESTIGE_REQUIREMENTS.minLevel;

    return {
      currentPrestige,
      canPrestige,
      minLevelRequired: PRESTIGE_REQUIREMENTS.minLevel,
      currentLevel: user.level,
      benefits,
      history: records,
    };
  }

  async prestige(userId: string) {
    let prestigeLevel: number;

    await this.dataSource.transaction(async (manager) => {
      const user = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.id = :userId', { userId })
        .setLock('pessimistic_write')
        .getOne();

      if (!user) throw new NotFoundException('User not found');
      if (user.level < PRESTIGE_REQUIREMENTS.minLevel) {
        throw new BadRequestException(`Must be level ${PRESTIGE_REQUIREMENTS.minLevel} to prestige`);
      }

      const currentPrestige = await manager
        .getRepository(PrestigeRecord)
        .count({ where: { userId } });

      prestigeLevel = currentPrestige + 1;

      const record = manager.getRepository(PrestigeRecord).create({
        userId,
        prestigeLevel,
        totalXpAtPrestige: String(user.xp),
        levelAtPrestige: user.level,
      });
      await manager.save(record);

      user.xp = 0;
      user.level = 1;
      await manager.save(user);
    });

    await this.auditService.log({
      userId,
      action: AuditAction.VIP_UPGRADED,
      metadata: { type: 'prestige', prestigeLevel },
    });

    const { wallet } = await this.economyService.credit(
      userId,
      PRESTIGE_REQUIREMENTS.coinBonus,
      TransactionType.ADMIN_ADJUST,
      `Prestige level ${prestigeLevel} bonus`,
    );

    const benefits = PRESTIGE_BENEFITS(prestigeLevel);
    this.eventsGateway.emitBalanceUpdate(userId, Number(wallet.balance));
    this.eventsGateway.emitToUser(userId, 'prestige_achieved', {
      prestigeLevel,
      benefits,
      coinBonus: PRESTIGE_REQUIREMENTS.coinBonus,
    });

    this.logger.log('User prestiged', { userId, prestigeLevel });
    return { success: true, prestigeLevel, coinBonus: PRESTIGE_REQUIREMENTS.coinBonus, benefits };
  }
}
