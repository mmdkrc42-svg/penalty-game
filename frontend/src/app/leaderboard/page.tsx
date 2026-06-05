'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { leaderboardApi } from '@/lib/api';
import { LeaderboardEntry } from '@/types';
import { formatCoins, cn } from '@/lib/utils';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/store/auth.store';

type Tab = 'earners' | 'cases' | 'richest';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('earners');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [tab]);
  useEffect(() => {
    leaderboardApi.getMyRank().then((r) => setMyRank(r)).catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = tab === 'earners'
        ? await leaderboardApi.getTopEarners()
        : tab === 'cases'
        ? await leaderboardApi.getTopCases()
        : await leaderboardApi.getRichest();
      setData(res as any || []);
    } catch {} finally { setLoading(false); }
  };

  const getValue = (entry: LeaderboardEntry) => {
    if (tab === 'earners') return formatCoins(Number(entry.totalEarned));
    if (tab === 'cases') return `${entry.totalCasesOpened || 0} cases`;
    return formatCoins(Number(entry.balance));
  };

  return (
    <AppShell title="LEADERBOARD">
      <div className="px-4 py-4 space-y-4">

        {/* My rank card */}
        {myRank && (
          <div className="card-glow p-4 flex items-center gap-3">
            <div className="text-3xl font-black text-white/30">#{myRank.earnerRank}</div>
            <div>
              <p className="text-sm font-semibold text-white">Your Rank</p>
              <p className="text-white/40 text-xs">
                Earned: {formatCoins(Number(myRank.totalEarned))} | Cases: {myRank.totalCasesOpened}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2">
          {(['earners', 'cases', 'richest'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'py-2 rounded-xl text-sm font-medium transition-all',
                tab === t ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/60',
              )}
            >
              {t === 'earners' ? '💰 Earners' : t === 'cases' ? '📦 Cases' : '🏦 Rich'}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <PageLoader />
        ) : (
          <div className="space-y-2">
            {data.map((entry, i) => {
              const isMe = entry.userId === user?.id;
              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    'card flex items-center gap-3 p-3 transition-all',
                    isMe && 'border-violet-500/50 bg-violet-900/10',
                    i < 3 && 'border-amber-500/20',
                  )}
                >
                  <div className="w-8 text-center">
                    {i < 3 ? (
                      <span className="text-xl">{MEDAL[i]}</span>
                    ) : (
                      <span className="text-white/40 font-bold text-sm">#{entry.rank}</span>
                    )}
                  </div>

                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {entry.photoUrl ? (
                      <img src={entry.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      entry.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-sm text-white truncate">
                        {entry.username || 'Anonymous'}
                      </span>
                      {isMe && <span className="text-xs bg-violet-600 text-white rounded px-1">You</span>}
                    </div>
                    <span className="text-white/30 text-xs">Lvl {entry.level}</span>
                  </div>

                  <div className="text-right flex items-center gap-1">
                    {tab !== 'cases' && <CoinIcon size={12} />}
                    <span className="font-bold text-sm text-amber-400">{getValue(entry)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
