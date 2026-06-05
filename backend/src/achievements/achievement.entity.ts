import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';

export enum AchievementCategory {
  CASES = 'cases',
  ECONOMY = 'economy',
  GAMES = 'games',
  SOCIAL = 'social',
  PROGRESSION = 'progression',
  SPECIAL = 'special',
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  xpReward: number;
  coinReward: number;
  criteria: {
    type: string;
    value: number;
  };
  secret?: boolean;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Cases
  { id: 'first_case', name: 'First Blast', description: 'Open your first case', icon: '📦', category: AchievementCategory.CASES, xpReward: 50, coinReward: 100, criteria: { type: 'cases_opened', value: 1 } },
  { id: 'cases_10', name: 'Case Connoisseur', description: 'Open 10 cases', icon: '🔓', category: AchievementCategory.CASES, xpReward: 100, coinReward: 300, criteria: { type: 'cases_opened', value: 10 } },
  { id: 'cases_50', name: 'Case Veteran', description: 'Open 50 cases', icon: '⚡', category: AchievementCategory.CASES, xpReward: 300, coinReward: 1000, criteria: { type: 'cases_opened', value: 50 } },
  { id: 'cases_100', name: 'Case Master', description: 'Open 100 cases', icon: '🏆', category: AchievementCategory.CASES, xpReward: 750, coinReward: 3000, criteria: { type: 'cases_opened', value: 100 } },
  { id: 'cases_500', name: 'Case Legend', description: 'Open 500 cases', icon: '👑', category: AchievementCategory.CASES, xpReward: 2500, coinReward: 15000, criteria: { type: 'cases_opened', value: 500 } },
  { id: 'legendary_drop', name: 'Lucky Strike', description: 'Win a Legendary item', icon: '⭐', category: AchievementCategory.CASES, xpReward: 500, coinReward: 2000, criteria: { type: 'rarity_obtained', value: 5 } },
  { id: 'mythic_drop', name: 'Mythic Pull', description: 'Win a Mythic item', icon: '🌟', category: AchievementCategory.CASES, xpReward: 2000, coinReward: 10000, criteria: { type: 'rarity_obtained', value: 6 }, secret: true },
  // Economy
  { id: 'first_sell', name: 'Merchant', description: 'Sell your first item', icon: '💰', category: AchievementCategory.ECONOMY, xpReward: 50, coinReward: 100, criteria: { type: 'items_sold', value: 1 } },
  { id: 'earned_10k', name: 'Earner', description: 'Earn 10,000 coins total', icon: '💵', category: AchievementCategory.ECONOMY, xpReward: 200, coinReward: 500, criteria: { type: 'total_earned', value: 10000 } },
  { id: 'earned_100k', name: 'Big Earner', description: 'Earn 100,000 coins total', icon: '💎', category: AchievementCategory.ECONOMY, xpReward: 1000, coinReward: 5000, criteria: { type: 'total_earned', value: 100000 } },
  { id: 'earned_1m', name: 'Millionaire', description: 'Earn 1,000,000 coins total', icon: '🤑', category: AchievementCategory.ECONOMY, xpReward: 5000, coinReward: 50000, criteria: { type: 'total_earned', value: 1000000 }, secret: true },
  // Games
  { id: 'first_game', name: 'Gambler', description: 'Play your first game', icon: '🎮', category: AchievementCategory.GAMES, xpReward: 50, coinReward: 100, criteria: { type: 'games_played', value: 1 } },
  { id: 'crash_3x', name: 'Moon Rider', description: 'Cash out at 3× in Crash', icon: '🚀', category: AchievementCategory.GAMES, xpReward: 200, coinReward: 500, criteria: { type: 'crash_multiplier', value: 3 } },
  { id: 'crash_10x', name: 'To The Moon', description: 'Cash out at 10× in Crash', icon: '🌕', category: AchievementCategory.GAMES, xpReward: 1000, coinReward: 3000, criteria: { type: 'crash_multiplier', value: 10 } },
  { id: 'coinflip_5w', name: 'Hot Streak', description: 'Win 5 coinflips in a row', icon: '🔥', category: AchievementCategory.GAMES, xpReward: 500, coinReward: 1500, criteria: { type: 'coinflip_streak', value: 5 } },
  { id: 'upgrade_win', name: 'Risk Taker', description: 'Win your first upgrade', icon: '⚡', category: AchievementCategory.GAMES, xpReward: 200, coinReward: 500, criteria: { type: 'upgrades_won', value: 1 } },
  // Social
  { id: 'first_referral', name: 'Recruiter', description: 'Refer your first friend', icon: '🔗', category: AchievementCategory.SOCIAL, xpReward: 200, coinReward: 500, criteria: { type: 'referrals', value: 1 } },
  { id: 'referrals_5', name: 'Ambassador', description: 'Refer 5 friends', icon: '🤝', category: AchievementCategory.SOCIAL, xpReward: 1000, coinReward: 3000, criteria: { type: 'referrals', value: 5 } },
  { id: 'referrals_20', name: 'Influencer', description: 'Refer 20 friends', icon: '📢', category: AchievementCategory.SOCIAL, xpReward: 5000, coinReward: 20000, criteria: { type: 'referrals', value: 20 } },
  // Progression
  { id: 'level_5', name: 'Rising Star', description: 'Reach Level 5', icon: '⭐', category: AchievementCategory.PROGRESSION, xpReward: 150, coinReward: 500, criteria: { type: 'level', value: 5 } },
  { id: 'level_10', name: 'Veteran', description: 'Reach Level 10', icon: '🏅', category: AchievementCategory.PROGRESSION, xpReward: 500, coinReward: 2000, criteria: { type: 'level', value: 10 } },
  { id: 'level_25', name: 'Elite', description: 'Reach Level 25', icon: '💎', category: AchievementCategory.PROGRESSION, xpReward: 2000, coinReward: 10000, criteria: { type: 'level', value: 25 } },
  { id: 'streak_7', name: 'Dedicated', description: 'Maintain a 7-day login streak', icon: '🗓️', category: AchievementCategory.PROGRESSION, xpReward: 500, coinReward: 2000, criteria: { type: 'daily_streak', value: 7 } },
  { id: 'streak_30', name: 'Devotee', description: 'Maintain a 30-day login streak', icon: '🏆', category: AchievementCategory.PROGRESSION, xpReward: 3000, coinReward: 15000, criteria: { type: 'daily_streak', value: 30 } },
];

@Entity('user_achievements')
@Unique(['userId', 'achievementId'])
@Index(['userId'])
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'achievement_id' })
  achievementId: string;

  @Column({ name: 'xp_rewarded', default: 0 })
  xpRewarded: number;

  @Column({ name: 'coins_rewarded', type: 'bigint', default: 0 })
  coinsRewarded: number;

  @CreateDateColumn({ name: 'unlocked_at' })
  unlockedAt: Date;
}
