import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EconomyService } from './economy.service';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { TransactionType } from './entities/transaction.entity';

const buildWallet = (balance: number) => ({
  id: 'wallet-id',
  userId: 'user-id',
  balance,
  totalDeposited: 0,
  totalWithdrawn: 0,
});

const mockWalletRepo = { findOne: jest.fn() };
const mockTxRepo = { findAndCount: jest.fn() };
const mockUserRepo = { increment: jest.fn() };

describe('EconomyService', () => {
  let service: EconomyService;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    const mockManager = {
      getRepository: jest.fn(),
      save: jest.fn(),
    };
    dataSource = { transaction: jest.fn((fn) => fn(mockManager)) };

    // Set up manager.getRepository to return appropriate mocks
    mockManager.getRepository.mockImplementation((entity) => {
      if (entity === Wallet) {
        return {
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(buildWallet(1000)),
          }),
        };
      }
      if (entity === Transaction) {
        return { create: jest.fn().mockReturnValue({}), save: jest.fn() };
      }
      if (entity === User) {
        return { increment: jest.fn() };
      }
      return {};
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EconomyService,
        { provide: getRepositoryToken(Wallet), useValue: mockWalletRepo },
        { provide: getRepositoryToken(Transaction), useValue: mockTxRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<EconomyService>(EconomyService);
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return the wallet balance', async () => {
      mockWalletRepo.findOne.mockResolvedValue(buildWallet(500));
      const balance = await service.getBalance('user-id');
      expect(balance).toBe(500);
    });

    it('should throw NotFoundException when wallet missing', async () => {
      mockWalletRepo.findOne.mockResolvedValue(null);
      await expect(service.getBalance('user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('debit', () => {
    it('should deduct the correct amount from balance', async () => {
      const wallet = buildWallet(1000);
      let savedWallet: any;

      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Wallet) {
            return {
              createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                setLock: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue({ ...wallet }),
              }),
            };
          }
          if (entity === Transaction) {
            return { create: jest.fn().mockReturnValue({}), save: jest.fn() };
          }
          if (entity === User) {
            return { increment: jest.fn() };
          }
        }),
        save: jest.fn().mockImplementation((w) => { savedWallet = w; return w; }),
      };

      dataSource.transaction.mockImplementation((fn) => fn(mockManager));

      const result = await service.debit('user-id', 300, TransactionType.GAME_BET, 'test bet');
      expect(result.wallet.balance).toBe(700);
    });

    it('should throw BadRequestException when balance is insufficient', async () => {
      const wallet = buildWallet(50);

      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Wallet) {
            return {
              createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                setLock: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue({ ...wallet }),
              }),
            };
          }
          return {};
        }),
        save: jest.fn(),
      };

      dataSource.transaction.mockImplementation((fn) => fn(mockManager));

      await expect(
        service.debit('user-id', 100, TransactionType.GAME_BET, 'test bet'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('credit', () => {
    it('should add the correct amount to balance', async () => {
      const wallet = buildWallet(500);

      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Wallet) {
            return {
              createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                setLock: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue({ ...wallet }),
              }),
            };
          }
          if (entity === Transaction) {
            return { create: jest.fn().mockReturnValue({}), save: jest.fn() };
          }
          if (entity === User) {
            return { increment: jest.fn() };
          }
        }),
        save: jest.fn().mockImplementation((w) => w),
      };

      dataSource.transaction.mockImplementation((fn) => fn(mockManager));

      const result = await service.credit('user-id', 200, TransactionType.GAME_WIN, 'win');
      expect(result.wallet.balance).toBe(700);
    });
  });
});
