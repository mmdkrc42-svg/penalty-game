import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../users/entities/user.entity';
import { Wallet } from '../economy/entities/wallet.entity';
import { Referral } from '../referrals/entities/referral.entity';

export interface TelegramInitData {
  auth_date: string;
  hash: string;
  user?: string;
  query_id?: string;
  chat_instance?: string;
  chat_type?: string;
  start_param?: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Referral) private readonly referralRepo: Repository<Referral>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  validateTelegramWebAppData(initDataRaw: string): TelegramUser {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new UnauthorizedException('Bot token not configured');

    const urlParams = new URLSearchParams(initDataRaw);
    const hash = urlParams.get('hash');
    if (!hash) throw new UnauthorizedException('Missing hash');

    urlParams.delete('hash');
    const entries = Array.from(urlParams.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram data signature');
    }

    const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      throw new UnauthorizedException('Telegram data expired');
    }

    const userStr = urlParams.get('user');
    if (!userStr) throw new UnauthorizedException('No user data');

    try {
      return JSON.parse(userStr) as TelegramUser;
    } catch {
      throw new UnauthorizedException('Invalid user data');
    }
  }

  async telegramAuth(
    initDataRaw: string,
    referralCode?: string,
  ): Promise<{ user: User; token: string; isNew: boolean }> {
    let telegramUser: TelegramUser;

    if (this.configService.get('NODE_ENV') === 'development' && !this.configService.get('TELEGRAM_BOT_TOKEN')) {
      telegramUser = { id: 123456789, first_name: 'Dev', username: 'devuser' };
    } else {
      telegramUser = this.validateTelegramWebAppData(initDataRaw);
    }

    let user = await this.userRepo.findOne({
      where: { telegramId: telegramUser.id },
      relations: ['wallet'],
    });

    let isNew = false;

    if (!user) {
      isNew = true;
      user = this.userRepo.create({
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        languageCode: telegramUser.language_code || 'en',
        photoUrl: telegramUser.photo_url,
        referralCode: this.generateReferralCode(telegramUser.id),
        role: this.configService
          .get<number[]>('admin.ids', [])
          .includes(telegramUser.id)
          ? UserRole.ADMIN
          : UserRole.USER,
      });

      user = await this.userRepo.save(user);

      const wallet = this.walletRepo.create({
        userId: user.id,
        balance: this.configService.get<number>('economy.startingBalance', 1000),
      });
      await this.walletRepo.save(wallet);
      user.wallet = wallet;

      if (referralCode) {
        await this.processReferral(user.id, referralCode);
      }
    } else {
      user.firstName = telegramUser.first_name;
      user.lastName = telegramUser.last_name;
      user.username = telegramUser.username;
      user.photoUrl = telegramUser.photo_url;
      user.lastSeen = new Date();
      await this.userRepo.save(user);
    }

    const token = this.jwtService.sign({
      sub: user.id,
      telegramId: user.telegramId,
      role: user.role,
    });

    return { user, token, isNew };
  }

  private async processReferral(newUserId: string, referralCode: string) {
    const referrer = await this.userRepo.findOne({ where: { referralCode } });
    if (!referrer || referrer.id === newUserId) return;

    const rewardAmount = this.configService.get<number>('economy.referralReward', 500);

    const referral = this.referralRepo.create({
      referrerId: referrer.id,
      referredId: newUserId,
      rewardAmount,
    });
    await this.referralRepo.save(referral);

    await this.userRepo.update(newUserId, { referredBy: referrer.id });

    const referrerWallet = await this.walletRepo.findOne({ where: { userId: referrer.id } });
    if (referrerWallet) {
      referrerWallet.balance = Number(referrerWallet.balance) + rewardAmount;
      await this.walletRepo.save(referrerWallet);
    }
  }

  private generateReferralCode(telegramId: number): string {
    return `BC${telegramId.toString(36).toUpperCase()}${uuidv4().slice(0, 4).toUpperCase()}`;
  }

  async validateUserById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['wallet'],
    });
    if (!user || user.isBanned) throw new UnauthorizedException();
    return user;
  }
}
