import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class EconomyService {
  constructor(
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async getWallet(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    return Number(wallet.balance);
  }

  async debit(
    userId: string,
    amount: number,
    type: TransactionType,
    description?: string,
    referenceId?: string,
    metadata?: Record<string, any>,
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager
        .getRepository(Wallet)
        .createQueryBuilder('wallet')
        .where('wallet.userId = :userId', { userId })
        .setLock('pessimistic_write')
        .getOne();

      if (!wallet) throw new NotFoundException('Wallet not found');
      if (Number(wallet.balance) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const balanceBefore = Number(wallet.balance);
      wallet.balance = balanceBefore - amount;
      wallet.totalWithdrawn = Number(wallet.totalWithdrawn) + amount;
      await manager.save(wallet);

      const tx = manager.getRepository(Transaction).create({
        walletId: wallet.id,
        userId,
        type,
        amount: -amount,
        balanceBefore,
        balanceAfter: Number(wallet.balance),
        description,
        referenceId,
        metadata,
      });
      await manager.save(tx);

      await manager.getRepository(User).increment({ id: userId }, 'totalSpent', amount);

      return { wallet, transaction: tx };
    });
  }

  async credit(
    userId: string,
    amount: number,
    type: TransactionType,
    description?: string,
    referenceId?: string,
    metadata?: Record<string, any>,
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager
        .getRepository(Wallet)
        .createQueryBuilder('wallet')
        .where('wallet.userId = :userId', { userId })
        .setLock('pessimistic_write')
        .getOne();

      if (!wallet) throw new NotFoundException('Wallet not found');

      const balanceBefore = Number(wallet.balance);
      wallet.balance = balanceBefore + amount;
      wallet.totalDeposited = Number(wallet.totalDeposited) + amount;
      await manager.save(wallet);

      const tx = manager.getRepository(Transaction).create({
        walletId: wallet.id,
        userId,
        type,
        amount,
        balanceBefore,
        balanceAfter: Number(wallet.balance),
        description,
        referenceId,
        metadata,
      });
      await manager.save(tx);

      await manager.getRepository(User).increment({ id: userId }, 'totalEarned', amount);

      return { wallet, transaction: tx };
    });
  }

  async getTransactionHistory(userId: string, limit = 50, offset = 0) {
    const wallet = await this.getWallet(userId);
    const [transactions, total] = await this.txRepo.findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { transactions, total, wallet };
  }
}
