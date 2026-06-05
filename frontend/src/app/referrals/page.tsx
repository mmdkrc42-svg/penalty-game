'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { referralsApi } from '@/lib/api';
import { ReferralStats } from '@/types';
import { formatCoins } from '@/lib/utils';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useTelegram } from '@/hooks/useTelegram';
import toast from 'react-hot-toast';

export default function ReferralsPage() {
  const { tg, haptic } = useTelegram();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    referralsApi.getStats().then((data) => {
      setStats(data as any);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const copyLink = async () => {
    if (!stats) return;
    haptic.light();
    await navigator.clipboard.writeText(stats.referralLink).catch(() => {});
    toast.success('Referral link copied!');
  };

  const shareLink = () => {
    if (!stats) return;
    haptic.medium();
    const text = `Join BlastCrates and get 500 free coins! 🎉\n${stats.referralLink}`;
    if (tg) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(stats.referralLink)}&text=${encodeURIComponent('Join BlastCrates and get 500 free coins! 🎉')}`);
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Share link copied!');
    }
  };

  if (loading) return <AppShell><PageLoader /></AppShell>;

  return (
    <AppShell title="REFERRALS">
      <div className="px-4 py-4 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-glow p-4 text-center">
            <div className="text-3xl font-black text-white">{stats?.totalReferrals || 0}</div>
            <div className="text-white/40 text-sm mt-1">Friends Invited</div>
          </div>
          <div className="card-glow p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <CoinIcon size={16} />
              <span className="text-2xl font-black text-amber-400">{formatCoins(stats?.totalEarned || 0)}</span>
            </div>
            <div className="text-white/40 text-sm mt-1">Total Earned</div>
          </div>
        </div>

        {/* How it works */}
        <div className="card p-4 space-y-3">
          <h3 className="font-bold text-white">How It Works</h3>
          {[
            { step: '1', text: 'Share your referral link', icon: '🔗' },
            { step: '2', text: 'Friend joins BlastCrates', icon: '👤' },
            { step: '3', text: 'Both get 500 coins!', icon: '🎁' },
          ].map(({ step, text, icon }) => (
            <div key={step} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold flex-shrink-0">{step}</div>
              <span className="text-sm">{icon} {text}</span>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <div className="card p-4 space-y-3">
          <h3 className="font-bold text-white">Your Referral Link</h3>
          <div className="bg-white/5 rounded-xl px-3 py-2 font-mono text-xs text-white/60 break-all">
            {stats?.referralLink}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={copyLink} className="btn-secondary text-sm py-3">
              📋 Copy Link
            </button>
            <button onClick={shareLink} className="btn-primary text-sm py-3">
              📤 Share
            </button>
          </div>
        </div>

        {/* Referral list */}
        {stats?.referrals && stats.referrals.length > 0 && (
          <div>
            <h3 className="font-bold text-white mb-3">Your Referrals</h3>
            <div className="space-y-2">
              {stats.referrals.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center font-bold">
                      {r.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{r.username || 'Anonymous'}</div>
                      <div className="text-white/30 text-xs">{new Date(r.joinedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <CoinIcon size={12} />
                    <span className="text-green-400 font-bold text-sm">+{formatCoins(r.rewardAmount)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
