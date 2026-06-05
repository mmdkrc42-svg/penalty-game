import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral) private readonly referralRepo: Repository<Referral>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async getReferralStats(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const referrals = await this.referralRepo.find({
      where: { referrerId: userId },
      relations: ['referred'],
      order: { createdAt: 'DESC' },
    });

    const totalEarned = referrals.reduce((sum, r) => sum + Number(r.rewardAmount), 0);
    const activeReferrals = referrals.length;

    return {
      referralCode: user.referralCode,
      referralLink: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${user.referralCode}`,
      totalReferrals: activeReferrals,
      totalEarned,
      referrals: referrals.map((r) => ({
        id: r.id,
        username: r.referred?.username || r.referred?.firstName,
        rewardAmount: r.rewardAmount,
        joinedAt: r.createdAt,
      })),
    };
  }

  async getLeaderboard(limit = 20) {
    const result = await this.referralRepo
      .createQueryBuilder('referral')
      .select('referral.referrerId', 'userId')
      .addSelect('COUNT(*)', 'referralCount')
      .addSelect('SUM(referral.rewardAmount)', 'totalEarned')
      .groupBy('referral.referrerId')
      .orderBy('"referralCount"', 'DESC')
      .limit(limit)
      .getRawMany();

    const withUsers = await Promise.all(
      result.map(async (r) => {
        const user = await this.userRepo.findOne({ where: { id: r.userId } });
        return {
          userId: r.userId,
          username: user?.username || user?.firstName || 'Anonymous',
          referralCount: parseInt(r.referralCount),
          totalEarned: parseInt(r.totalEarned),
        };
      }),
    );

    return withUsers;
  }
}
