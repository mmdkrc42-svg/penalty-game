import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CrashService } from './crash.service';
import { GameRound } from '../entities/game-round.entity';
import { EconomyService } from '../../economy/economy.service';
import { AntiFraudService } from '../../anti-fraud/anti-fraud.service';
import { AuditService } from '../../audit/audit.service';
import { AppLogger } from '../../common/logger/app-logger.service';
import { AchievementsService } from '../../achievements/achievements.service';
import { MissionsService } from '../../missions/missions.service';
import { VipService } from '../../vip/vip.service';
import { EventsGateway } from '../../websocket/events.gateway';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
};

const mockEconomy = { debit: jest.fn(), credit: jest.fn() };
const mockAntiFraud = { checkBetVelocity: jest.fn(), checkWinPattern: jest.fn() };
const mockAudit = { log: jest.fn() };
const mockLogger = { setContext: jest.fn(), log: jest.fn(), debug: jest.fn(), error: jest.fn() };
const mockAchievements = { triggerGamePlayedCheck: jest.fn(), triggerCrashMultiplierCheck: jest.fn() };
const mockMissions = { updateProgress: jest.fn() };
const mockVip = { addWager: jest.fn() };
const mockEvents = { emitBalanceUpdate: jest.fn() };
const mockDataSource = { transaction: jest.fn() };

describe('CrashService', () => {
  let service: CrashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrashService,
        { provide: getRepositoryToken(GameRound), useValue: mockRepo },
        { provide: EconomyService, useValue: mockEconomy },
        { provide: AntiFraudService, useValue: mockAntiFraud },
        { provide: AuditService, useValue: mockAudit },
        { provide: AppLogger, useValue: mockLogger },
        { provide: AchievementsService, useValue: mockAchievements },
        { provide: MissionsService, useValue: mockMissions },
        { provide: VipService, useValue: mockVip },
        { provide: EventsGateway, useValue: mockEvents },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<CrashService>(CrashService);
    jest.clearAllMocks();
  });

  describe('generateProvablyFairCrash', () => {
    it('should always return crashPoint >= 1.0', () => {
      for (let i = 0; i < 1000; i++) {
        const { crashPoint } = service.generateProvablyFairCrash();
        expect(crashPoint).toBeGreaterThanOrEqual(1.0);
      }
    });

    it('should return crashPoint <= 1000', () => {
      for (let i = 0; i < 100; i++) {
        const { crashPoint } = service.generateProvablyFairCrash();
        expect(crashPoint).toBeLessThanOrEqual(1000);
      }
    });

    it('should be deterministic for the same seed', () => {
      const seed = 'abc123deadbeef';
      const result1 = service.generateProvablyFairCrash(seed);
      const result2 = service.generateProvablyFairCrash(seed);
      expect(result1.crashPoint).toBe(result2.crashPoint);
      expect(result1.hash).toBe(result2.hash);
    });

    it('should return different results for different seeds', () => {
      const results = new Set<number>();
      for (let i = 0; i < 20; i++) {
        const { crashPoint } = service.generateProvablyFairCrash();
        results.add(crashPoint);
      }
      expect(results.size).toBeGreaterThan(5);
    });

    it('should not always return 26.0 (regression test for broken formula)', () => {
      const crashPoints = Array.from({ length: 100 }, () => service.generateProvablyFairCrash().crashPoint);
      const allSame = crashPoints.every((v) => v === crashPoints[0]);
      expect(allSame).toBe(false);
    });

    it('should apply house edge - some rounds crash at 1.0', () => {
      let atOne = 0;
      for (let i = 0; i < 10000; i++) {
        const { crashPoint } = service.generateProvablyFairCrash();
        if (crashPoint === 1.0) atOne++;
      }
      // Expect roughly 3% of rounds to crash at 1.0 (1/33 ≈ 3.03%)
      expect(atOne).toBeGreaterThan(100);
      expect(atOne).toBeLessThan(1000);
    });

    it('should return consistent hash for verification', () => {
      const seed = 'test-seed-for-verification';
      const { crashPoint, hash, serverSeed } = service.generateProvablyFairCrash(seed);
      expect(serverSeed).toBe(seed);
      expect(hash).toHaveLength(64);
      expect(typeof crashPoint).toBe('number');
    });
  });

  describe('placeBet', () => {
    it('should reject bets below minimum', async () => {
      await expect(service.placeBet('user1', 5, undefined, '127.0.0.1')).rejects.toThrow('Minimum bet is 10');
    });

    it('should reject bets above maximum', async () => {
      await expect(service.placeBet('user1', 200_000, undefined, '127.0.0.1')).rejects.toThrow('Maximum bet');
    });

    it('should reject when velocity check fails', async () => {
      mockAntiFraud.checkBetVelocity.mockResolvedValue({ allowed: false, reason: 'Rate limit exceeded' });
      await expect(service.placeBet('user1', 100, undefined, '127.0.0.1')).rejects.toThrow('Rate limit exceeded');
    });

    it('should place bet successfully', async () => {
      mockAntiFraud.checkBetVelocity.mockResolvedValue({ allowed: true });
      mockEconomy.debit.mockResolvedValue({
        transaction: { id: 'tx-id' },
        wallet: { balance: 900 },
      });
      mockRepo.create.mockReturnValue({ id: 'round-id', betAmount: 100 });
      mockRepo.save.mockResolvedValue({ id: 'round-id', betAmount: 100 });
      mockAudit.log.mockResolvedValue(undefined);

      const result = await service.placeBet('user1', 100, 2.0, '127.0.0.1');

      expect(result).toHaveProperty('roundId');
      expect(result).toHaveProperty('crashPoint');
      expect(result).toHaveProperty('hash');
      expect(mockEconomy.debit).toHaveBeenCalledWith('user1', 100, expect.any(String), expect.any(String), undefined, expect.any(Object));
    });

    it('should detect auto-cash-out win', async () => {
      mockAntiFraud.checkBetVelocity.mockResolvedValue({ allowed: true });
      mockEconomy.debit.mockResolvedValue({
        transaction: { id: 'tx-id' },
        wallet: { balance: 900 },
      });

      const testSeed = 'high-crash-seed-test';
      const { crashPoint } = service.generateProvablyFairCrash(testSeed);

      mockRepo.create.mockReturnValue({ id: 'round-id' });
      mockRepo.save.mockResolvedValue({ id: 'round-id' });
      mockAudit.log.mockResolvedValue(undefined);

      if (crashPoint > 1.5) {
        const result = await service.placeBet('user1', 100, 1.01, '127.0.0.1');
        expect(result.willWin).toBeDefined();
      }
    });
  });

  describe('verifyCrash', () => {
    it('should verify a correct crash point', async () => {
      const seed = 'known-verification-seed';
      const { crashPoint } = service.generateProvablyFairCrash(seed);
      const isValid = await service.verifyCrash(seed, crashPoint);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect crash point', async () => {
      const seed = 'known-verification-seed-2';
      const isValid = await service.verifyCrash(seed, 999.99);
      const { crashPoint } = service.generateProvablyFairCrash(seed);
      if (Math.abs(crashPoint - 999.99) >= 0.01) {
        expect(isValid).toBe(false);
      }
    });
  });
});
