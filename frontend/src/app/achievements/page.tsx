'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { achievementsApi } from '@/lib/api';
import { formatCoins } from '@/lib/utils';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CoinIcon } from '@/components/ui/CoinIcon';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  coinReward: number;
  unlocked: boolean;
  unlockedAt: string | null;
  secret?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  cases: '📦 Cases',
  economy: '💰 Economy',
  games: '🎮 Games',
  social: '👥 Social',
  progression: '📈 Progression',
  special: '⭐ Special',
};

function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-2xl p-4 border transition-all ${
        achievement.unlocked
          ? 'bg-gradient-to-br from-brand-900/40 to-surface-800/60 border-brand-500/30'
          : 'bg-surface-800/30 border-white/5 opacity-60'
      }`}
    >
      {achievement.unlocked && (
        <span className="absolute top-2 right-2 text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">
          ✓ Unlocked
        </span>
      )}
      <div className="flex items-start gap-3">
        <span className={`text-3xl ${!achievement.unlocked ? 'grayscale opacity-40' : ''}`}>
          {achievement.icon}
        </span>
        <div className="flex-1">
          <h3 className={`font-bold text-sm ${achievement.unlocked ? 'text-white' : 'text-surface-500'}`}>
            {achievement.name}
          </h3>
          <p className="text-surface-400 text-xs mt-0.5">{achievement.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-surface-400">
            <span className="flex items-center gap-1">
              <CoinIcon size={10} />
              {formatCoins(achievement.coinReward)}
            </span>
            <span>+{achievement.xpReward} XP</span>
            {achievement.unlockedAt && (
              <span className="ml-auto text-surface-600">
                {new Date(achievement.unlockedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AchievementsPage() {
  const [data, setData] = useState<{
    achievements: Achievement[];
    unlockedCount: number;
    totalCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    achievementsApi.getAll()
      .then((d: any) => setData(d))
      .catch(() => toast.error('Failed to load achievements'))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)];

  const filtered = data?.achievements.filter(
    (a) => activeCategory === 'all' || a.category === activeCategory
  ) ?? [];

  const unlocked = filtered.filter((a) => a.unlocked);
  const locked = filtered.filter((a) => !a.unlocked);

  return (
    <AppShell title="Achievements">
      <div className="px-4 py-4">
        {/* Progress bar */}
        {data && (
          <div className="mb-4 bg-surface-800/60 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-white">Progress</span>
              <span className="text-sm text-brand-400 font-bold">
                {data.unlockedCount} / {data.totalCount}
              </span>
            </div>
            <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(data.unlockedCount / data.totalCount) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-800/60 text-surface-400 hover:text-white'
              }`}
            >
              {cat === 'all' ? '🏆 All' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-surface-800/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {unlocked.length > 0 && (
              <>
                <p className="text-xs text-surface-500">Unlocked ({unlocked.length})</p>
                {unlocked.map((a) => <AchievementCard key={a.id} achievement={a} />)}
              </>
            )}
            {locked.length > 0 && (
              <>
                <p className="text-xs text-surface-500 mt-4">Locked ({locked.length})</p>
                {locked.map((a) => <AchievementCard key={a.id} achievement={a} />)}
              </>
            )}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-surface-500">
                <p className="text-3xl mb-2">🏆</p>
                <p>No achievements in this category</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
