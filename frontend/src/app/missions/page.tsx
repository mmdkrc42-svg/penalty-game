'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { missionsApi } from '@/lib/api';
import { formatCoins } from '@/lib/utils';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CoinIcon } from '@/components/ui/CoinIcon';

interface Mission {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'daily' | 'weekly';
  status: 'active' | 'completed' | 'claimed' | 'expired';
  progress: number;
  target: number;
  xpReward: number;
  coinReward: number;
  expiresAt: string;
}

function MissionCard({ mission, onClaim }: { mission: Mission; onClaim: (id: string) => void }) {
  const progressPct = Math.min((mission.progress / mission.target) * 100, 100);
  const isClaimed = mission.status === 'claimed';
  const isCompleted = mission.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-surface-800/60 rounded-2xl p-4 border ${
        isClaimed ? 'border-surface-700/30 opacity-60' :
        isCompleted ? 'border-brand-500/50' : 'border-white/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{mission.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-white text-sm truncate">{mission.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
              mission.type === 'daily'
                ? 'bg-blue-500/20 text-blue-300'
                : 'bg-purple-500/20 text-purple-300'
            }`}>
              {mission.type}
            </span>
          </div>
          <p className="text-surface-400 text-xs mt-0.5">{mission.description}</p>

          <div className="mt-2">
            <div className="flex justify-between text-xs text-surface-400 mb-1">
              <span>{mission.progress} / {mission.target}</span>
              <span>{progressPct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  isCompleted || isClaimed ? 'bg-brand-500' : 'bg-brand-600'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs text-surface-400">
              <span className="flex items-center gap-1">
                <CoinIcon size={12} />
                {formatCoins(Number(mission.coinReward))}
              </span>
              <span>+{mission.xpReward} XP</span>
            </div>
            {isCompleted && (
              <button
                onClick={() => onClaim(mission.id)}
                className="px-3 py-1 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Claim
              </button>
            )}
            {isClaimed && (
              <span className="text-xs text-surface-500">Claimed ✓</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<{ daily: Mission[]; weekly: Mission[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');

  const load = async () => {
    try {
      const data = await missionsApi.getAll() as any;
      setMissions(data);
    } catch {
      toast.error('Failed to load missions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleClaim = async (missionId: string) => {
    try {
      const result = await missionsApi.claim(missionId) as any;
      toast.success(`Claimed! +${formatCoins(result.coinsEarned)} coins`);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim');
    }
  };

  const currentMissions = missions?.[tab] ?? [];
  const activeMissions = currentMissions.filter((m) => m.status === 'active' || m.status === 'completed');
  const claimedMissions = currentMissions.filter((m) => m.status === 'claimed');

  return (
    <AppShell title="Missions">
      <div className="px-4 py-4">
        {/* Tab switcher */}
        <div className="flex gap-2 mb-4 bg-surface-800/60 rounded-xl p-1">
          {(['daily', 'weekly'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t
                  ? 'bg-brand-500 text-white'
                  : 'text-surface-400 hover:text-white'
              }`}
            >
              {t === 'daily' ? '📅 Daily' : '📆 Weekly'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-surface-800/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {activeMissions.length === 0 && claimedMissions.length === 0 ? (
              <div className="text-center py-12 text-surface-500">
                <p className="text-3xl mb-2">🎯</p>
                <p>No missions available</p>
              </div>
            ) : (
              <>
                {activeMissions.map((mission) => (
                  <MissionCard key={mission.id} mission={mission} onClaim={handleClaim} />
                ))}
                {claimedMissions.length > 0 && (
                  <>
                    <p className="text-xs text-surface-500 mt-4 mb-2">Completed</p>
                    {claimedMissions.map((mission) => (
                      <MissionCard key={mission.id} mission={mission} onClaim={handleClaim} />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
