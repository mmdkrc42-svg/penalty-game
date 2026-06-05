import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AntiFraudService } from './anti-fraud.service';
import { AppLogger } from '../common/logger/app-logger.service';
import { AuditService } from '../audit/audit.service';
import { REDIS_CLIENT } from '../database/database.module';
import { GameRound, GameResult } from '../games/entities/game-round.entity';

const mockLogger = { setContext: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn() };
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockConfig = { get: jest.fn() };

describe('AntiFraudService', () => {
  let service: AntiFraudService;
  let mockRedis: Record<string, jest.Mock>;
  let mockGameRoundRepo: { find: jest.Mock };

  beforeEach(async () => {
    mockRedis = {
      incr: jest.fn(),
      expire: jest.fn().mockResolvedValue(1),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      sadd: jest.fn().mockResolvedValue(1),
      scard: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
    };
    mockGameRoundRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntiFraudService,
        { provide: AppLogger, useValue: mockLogger },
        { provide: AuditService, useValue: mockAudit },
        { provide: ConfigService, useValue: mockConfig },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: getRepositoryToken(GameRound), useValue: mockGameRoundRepo },
      ],
    }).compile();

    service = module.get<AntiFraudService>(AntiFraudService);
    jest.clearAllMocks();
  });

  describe('checkBetVelocity', () => {
    it('should allow bets within user rate limit', async () => {
      mockRedis.incr
        .mockResolvedValueOnce(5)   // user bets
        .mockResolvedValueOnce(10); // ip bets
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.checkBetVelocity('user-1', '192.168.1.1');
      expect(result.allowed).toBe(true);
    });

    it('should block user exceeding per-user rate limit', async () => {
      mockRedis.incr
        .mockResolvedValueOnce(31)  // user bets: 31 > 30 limit
        .mockResolvedValueOnce(5);  // ip bets
      mockRedis.expire.mockResolvedValue(1);
      mockAudit.log.mockResolvedValue(undefined);
      mockRedis.incr.mockResolvedValue(1); // for fraud score
      mockRedis.get.mockResolvedValue('0');

      const result = await service.checkBetVelocity('user-1', '192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('rate limit');
    });

    it('should block when IP exceeds rate limit', async () => {
      mockRedis.incr
        .mockResolvedValueOnce(5)   // user bets: within
        .mockResolvedValueOnce(70)  // ip bets: 70 > 60 limit
        .mockResolvedValue(1);      // fraud score increment
      mockRedis.expire.mockResolvedValue(1);
      mockAudit.log.mockResolvedValue(undefined);
      mockRedis.get.mockResolvedValue('0');

      const result = await service.checkBetVelocity('user-1', '192.168.1.1');
      expect(result.allowed).toBe(false);
    });

    it('should allow bets exactly at the limit', async () => {
      mockRedis.incr
        .mockResolvedValueOnce(30)  // user: at limit (not over)
        .mockResolvedValueOnce(60); // ip: at limit
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.checkBetVelocity('user-1', '1.2.3.4');
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkWinPattern', () => {
    it('should return not suspicious for normal win rate', async () => {
      const games = Array.from({ length: 20 }, (_, i) => ({
        result: i < 10 ? GameResult.WIN : GameResult.LOSS,
      }));
      mockGameRoundRepo.find.mockResolvedValue(games);

      const result = await service.checkWinPattern('user-1');
      expect(result.suspicious).toBe(false);
      expect(result.winRate).toBeCloseTo(0.5);
    });

    it('should flag suspiciously high win rate', async () => {
      const games = Array.from({ length: 20 }, (_, i) => ({
        result: i < 18 ? GameResult.WIN : GameResult.LOSS,
      }));
      mockGameRoundRepo.find.mockResolvedValue(games);
      mockAudit.log.mockResolvedValue(undefined);
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.get.mockResolvedValue('0');

      const result = await service.checkWinPattern('user-1');
      expect(result.suspicious).toBe(true);
      expect(result.winRate).toBeGreaterThan(0.85);
    });

    it('should not flag when fewer than 10 games', async () => {
      mockGameRoundRepo.find.mockResolvedValue([
        { result: GameResult.WIN },
        { result: GameResult.WIN },
        { result: GameResult.WIN },
      ]);

      const result = await service.checkWinPattern('user-1');
      expect(result.suspicious).toBe(false);
    });

    it('should not flag 100% win rate with fewer than 10 games', async () => {
      const games = Array.from({ length: 5 }, () => ({ result: GameResult.WIN }));
      mockGameRoundRepo.find.mockResolvedValue(games);

      const result = await service.checkWinPattern('user-1');
      expect(result.suspicious).toBe(false);
    });
  });

  describe('getFraudScore', () => {
    it('should return 0 when no score exists', async () => {
      mockRedis.get.mockResolvedValue(null);
      const score = await service.getFraudScore('user-1');
      expect(score).toBe(0);
    });

    it('should return parsed score', async () => {
      mockRedis.get.mockResolvedValue('7');
      const score = await service.getFraudScore('user-1');
      expect(score).toBe(7);
    });
  });
});
