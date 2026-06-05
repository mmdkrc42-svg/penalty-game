import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../economy/entities/wallet.entity';
import { Case } from '../cases/entities/case.entity';
import { CaseItem } from '../cases/entities/case-item.entity';
import { Transaction } from '../economy/entities/transaction.entity';
import { EconomyService } from '../economy/economy.service';
import { TransactionType } from '../economy/entities/transaction.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Case) private readonly caseRepo: Repository<Case>,
    @InjectRepository(CaseItem) private readonly caseItemRepo: Repository<CaseItem>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    private readonly economyService: EconomyService,
  ) {}

  async getDashboardStats() {
    const [totalUsers, bannedUsers, totalCases, totalTransactions] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { isBanned: true } }),
      this.caseRepo.count(),
      this.txRepo.count(),
    ]);

    const totalVolume = await this.txRepo
      .createQueryBuilder('tx')
      .select('SUM(ABS(tx.amount))', 'total')
      .getRawOne();

    const recentUsers = await this.userRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['wallet'],
    });

    return {
      totalUsers,
      bannedUsers,
      totalCases,
      totalTransactions,
      totalVolume: totalVolume?.total || 0,
      recentUsers,
    };
  }

  async getUsers(page = 1, limit = 20, search?: string) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.wallet', 'wallet')
      .orderBy('user.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (search) {
      qb.where('user.username ILIKE :search OR user.firstName ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [users, total] = await qb.getManyAndCount();
    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async banUser(userId: string, reason: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.isBanned = true;
    user.banReason = reason;
    return this.userRepo.save(user);
  }

  async unbanUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.isBanned = false;
    user.banReason = null;
    return this.userRepo.save(user);
  }

  async adjustBalance(userId: string, amount: number, reason: string) {
    if (amount > 0) {
      return this.economyService.credit(userId, amount, TransactionType.ADMIN_ADJUST, reason);
    } else {
      return this.economyService.debit(userId, Math.abs(amount), TransactionType.ADMIN_ADJUST, reason);
    }
  }

  async createCase(data: Partial<Case>) {
    const c = this.caseRepo.create(data);
    return this.caseRepo.save(c);
  }

  async updateCase(id: string, data: Partial<Case>) {
    await this.caseRepo.update(id, data);
    return this.caseRepo.findOne({ where: { id }, relations: ['items'] });
  }

  async deleteCase(id: string) {
    await this.caseRepo.update(id, { isActive: false });
    return { deleted: true };
  }

  async addCaseItem(caseId: string, item: Partial<CaseItem>) {
    const caseItem = this.caseItemRepo.create({ ...item, caseId });
    return this.caseItemRepo.save(caseItem);
  }

  async updateCaseItem(itemId: string, data: Partial<CaseItem>) {
    await this.caseItemRepo.update(itemId, data);
    return this.caseItemRepo.findOne({ where: { id: itemId } });
  }

  async deleteCaseItem(itemId: string) {
    await this.caseItemRepo.update(itemId, { active: false });
    return { deleted: true };
  }
}
