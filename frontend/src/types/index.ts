export interface User {
  id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  languageCode: string;
  role: 'user' | 'admin' | 'moderator';
  isBanned: boolean;
  xp: number;
  level: number;
  totalCasesOpened: number;
  totalSpent: number;
  totalEarned: number;
  referralCode: string;
  dailyStreak: number;
  lastDailyClaim?: string;
  createdAt: string;
  wallet?: Wallet;
  nextLevelXp?: number;
  xpProgress?: number;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}

export type TransactionType =
  | 'case_open'
  | 'item_sell'
  | 'daily_reward'
  | 'referral_reward'
  | 'game_bet'
  | 'game_win'
  | 'admin_adjust'
  | 'upgrade';

export interface Case {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  category: CaseCategory;
  isActive: boolean;
  isFeatured: boolean;
  totalOpened: number;
  items: CaseItem[];
}

export type CaseCategory =
  | 'starter'
  | 'premium'
  | 'epic'
  | 'legendary'
  | 'limited'
  | 'event';

export interface CaseItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  rarity: ItemRarity;
  value: number;
  probability: number;
  chance?: string;
}

export type ItemRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic';

export interface InventoryItem {
  id: string;
  userId: string;
  name: string;
  imageUrl?: string;
  rarity: ItemRarity;
  value: number;
  status: 'active' | 'sold' | 'upgraded' | 'used';
  soldFor?: number;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface Referral {
  id: string;
  username?: string;
  rewardAmount: number;
  joinedAt: string;
}

export interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  totalEarned: number;
  referrals: Referral[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  photoUrl?: string;
  level: number;
  totalEarned?: number;
  totalCasesOpened?: number;
  balance?: number;
}

export interface GameRound {
  id: string;
  type: 'crash' | 'coinflip' | 'upgrade';
  betAmount: number;
  payoutAmount: number;
  result: 'win' | 'loss' | 'cancelled';
  multiplier?: number;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface DailyRewardResult {
  canClaim: boolean;
  reward?: number;
  streak?: number;
  nextClaimAt: string;
}
