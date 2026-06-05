'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { economyApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCoins, formatNumber } from '@/lib/utils';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { Transaction } from '@/types';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);

  useEffect(() => {
    economyApi.getTransactions(20).then((data: any) => {
      setTransactions(data.transactions || []);
    }).catch(() => {}).finally(() => setLoadingTx(false));
  }, []);

  const txIcons: Record<string, string> = {
    case_open: '📦', item_sell: '💰', daily_reward: '🎁',
    referral_reward: '🔗', game_bet: '🎮', game_win: '🏆',
    admin_adjust: '⚙️', upgrade: '⚡',
  };

  const xpProgress = user ? (Number(user.xp) / (user.nextLevelXp || 100)) * 100 : 0;

  return (
    <AppShell title="PROFILE">
      <div className="px-4 py-4 space-y-4">

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glow p-5 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-3xl font-black shadow-[0_0_30px_rgba(124,58,237,0.4)]">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                user?.username?.[0]?.toUpperCase() || user?.firstName?.[0]?.toUpperCase() || 'B'
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black text-white">
                {user?.firstName} {user?.lastName || ''}
              </h2>
              {user?.username && <p className="text-violet-400 text-sm">@{user.username}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-violet-600/30 text-violet-400 text-xs px-2 py-0.5 rounded-full font-medium">
                  Level {user?.level || 1}
                </span>
                <span className="bg-white/10 text-white/40 text-xs px-2 py-0.5 rounded-full capitalize">
                  {user?.role || 'user'}
                </span>
              </div>
            </div>
          </div>

          {/* XP Progress */}
          <div className="relative mt-4">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>XP Progress</span>
              <span>{formatNumber(Number(user?.xp || 0))} / {formatNumber(user?.nextLevelXp || 100)}</span>
            </div>
            <div className="bg-white/10 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                transition={{ duration: 1.2, delay: 0.3 }}
                className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Balance', value: formatCoins(Number(user?.wallet?.balance || 0)), icon: '💰', color: 'text-amber-400' },
            { label: 'Total Earned', value: formatCoins(Number(user?.totalEarned || 0)), icon: '📈', color: 'text-green-400' },
            { label: 'Cases Opened', value: formatNumber(user?.totalCasesOpened || 0), icon: '📦', color: 'text-blue-400' },
            { label: 'Daily Streak', value: `${user?.dailyStreak || 0} days`, icon: '🔥', color: 'text-orange-400' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="card p-3">
              <div className="text-xl mb-1">{icon}</div>
              <div className={`font-bold text-lg ${color}`}>{value}</div>
              <div className="text-white/40 text-xs">{label}</div>
            </div>
          ))}
        </div>

        {/* Referral code */}
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Referral Code</p>
            <p className="text-violet-400 font-mono text-lg font-bold">{user?.referralCode}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(user?.referralCode || '')}
            className="bg-violet-600/30 text-violet-400 px-4 py-2 rounded-xl text-sm font-medium"
          >
            Copy
          </button>
        </div>

        {/* Transaction history */}
        <div>
          <h3 className="font-bold text-white mb-3">Transaction History</h3>
          {loadingTx ? (
            <div className="skeleton h-32" />
          ) : transactions.length === 0 ? (
            <div className="text-center text-white/40 py-8 text-sm">No transactions yet</div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="card flex items-center gap-3 p-3">
                  <div className="text-xl">{txIcons[tx.type] || '💫'}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium capitalize">
                      {tx.type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-white/30 text-xs">{new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                  <div className={`font-bold ${Number(tx.amount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Number(tx.amount) >= 0 ? '+' : ''}{formatCoins(Number(tx.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
