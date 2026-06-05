'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuthStore } from '@/store/auth.store';
import { useTelegram } from '@/hooks/useTelegram';
import { usersApi, casesApi } from '@/lib/api';
import { formatCoins, timeUntil } from '@/lib/utils';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { Case } from '@/types';
import toast from 'react-hot-toast';

export default function HomePage() {
  const { user, refreshUser } = useAuthStore();
  const { haptic } = useTelegram();
  const [featuredCases, setFeaturedCases] = useState<Case[]>([]);
  const [dailyState, setDailyState] = useState<{ canClaim: boolean; nextClaimAt?: string; streak?: number } | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    casesApi.getAll().then((cases: any) => {
      setFeaturedCases((cases || []).filter((c: Case) => c.isFeatured).slice(0, 3));
    }).catch(() => {});

    checkDailyStatus();
  }, []);

  const checkDailyStatus = async () => {
    try {
      const result = await usersApi.claimDaily();
      const data = result as any;
      if (data.canClaim === false) {
        setDailyState({ canClaim: false, nextClaimAt: data.nextClaimAt });
      } else {
        setDailyState({ canClaim: true });
      }
    } catch {}
  };

  const handleClaimDaily = async () => {
    if (claiming || !dailyState?.canClaim) return;
    setClaiming(true);
    haptic.success();
    try {
      const result = await usersApi.claimDaily();
      const data = result as any;
      if (data.canClaim) {
        toast.success(`+${formatCoins(data.reward)} coins! Streak: ${data.streak} 🔥`);
        setDailyState({ canClaim: false, nextClaimAt: data.nextClaimAt, streak: data.streak });
        await refreshUser();
      } else {
        toast.error(`Come back in ${timeUntil(data.nextClaimAt)}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim');
    } finally {
      setClaiming(false);
    }
  };

  const xpProgress = user ? (Number(user.xp) / (user.nextLevelXp || 100)) * 100 : 0;

  return (
    <AppShell title="BLASTCRATES">
      <div className="px-4 py-4 space-y-4">

        {/* Welcome card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glow p-4 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent" />
          <div className="relative flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-2xl font-black">
              {user?.username?.[0]?.toUpperCase() || user?.firstName?.[0]?.toUpperCase() || 'B'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-white">
                Hey, {user?.firstName || user?.username || 'Blaster'} 👋
              </h2>
              <p className="text-white/40 text-sm">Level {user?.level || 1}</p>
              {/* XP bar */}
              <div className="mt-2 bg-white/10 rounded-full h-1.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
                />
              </div>
              <p className="text-white/30 text-xs mt-0.5">
                {Number(user?.xp || 0)} / {user?.nextLevelXp || 100} XP
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Balance', value: formatCoins(Number(user?.wallet?.balance || 0)), icon: '💰' },
            { label: 'Cases', value: user?.totalCasesOpened?.toString() || '0', icon: '📦' },
            { label: 'Streak', value: `${user?.dailyStreak || 0}🔥`, icon: '🌟' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-3 text-center"
            >
              <div className="text-lg">{stat.icon}</div>
              <div className="font-bold text-sm text-white mt-1">{stat.value}</div>
              <div className="text-white/40 text-xs">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Daily reward */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleClaimDaily}
          disabled={!dailyState?.canClaim || claiming}
          className={`w-full rounded-2xl p-4 flex items-center justify-between transition-all duration-200 ${
            dailyState?.canClaim
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-[0_0_30px_rgba(124,58,237,0.4)]'
              : 'bg-white/5 opacity-60'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎁</div>
            <div className="text-left">
              <div className="font-bold text-white">Daily Reward</div>
              <div className="text-white/60 text-sm">
                {dailyState?.canClaim
                  ? 'Tap to claim your reward!'
                  : `Next in ${timeUntil(dailyState?.nextClaimAt || '')}`}
              </div>
            </div>
          </div>
          {dailyState?.canClaim && (
            <div className="bg-white/20 rounded-xl px-3 py-1.5 text-sm font-bold">
              Claim
            </div>
          )}
        </motion.button>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/cases" className="card p-4 flex flex-col items-center gap-2 hover:border-violet-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-2xl">📦</div>
            <span className="font-semibold text-sm">Open Cases</span>
            <span className="text-white/40 text-xs">Find rare items</span>
          </Link>
          <Link href="/games" className="card p-4 flex flex-col items-center gap-2 hover:border-violet-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">🎮</div>
            <span className="font-semibold text-sm">Play Games</span>
            <span className="text-white/40 text-xs">Double or nothing</span>
          </Link>
          <Link href="/inventory" className="card p-4 flex flex-col items-center gap-2 hover:border-violet-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl">🎒</div>
            <span className="font-semibold text-sm">Inventory</span>
            <span className="text-white/40 text-xs">Manage items</span>
          </Link>
          <Link href="/referrals" className="card p-4 flex flex-col items-center gap-2 hover:border-violet-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">🔗</div>
            <span className="font-semibold text-sm">Referrals</span>
            <span className="text-white/40 text-xs">Earn together</span>
          </Link>
        </div>

        {/* Featured cases */}
        {featuredCases.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white">Featured Cases</h3>
              <Link href="/cases" className="text-violet-400 text-sm">View all →</Link>
            </div>
            <div className="space-y-2">
              {featuredCases.map((c) => (
                <Link key={c.id} href={`/cases/${c.id}`} className="card flex items-center gap-3 p-3 hover:border-violet-500/30 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-900 to-purple-950 flex items-center justify-center text-2xl">📦</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="text-white/40 text-xs capitalize">{c.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <CoinIcon size={12} />
                      <span className="text-amber-400 font-bold text-sm">{formatCoins(Number(c.price))}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
