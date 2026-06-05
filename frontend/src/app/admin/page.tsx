'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCoins, formatNumber } from '@/lib/utils';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'dashboard' | 'users'>('dashboard');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/home');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/users?limit=20'),
      ]);
      setStats(statsData as any);
      setUsers((usersData as any).users || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const banUser = async (userId: string, reason: string) => {
    try {
      await api.post(`/admin/users/${userId}/ban`, { reason });
      toast.success('User banned');
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const unbanUser = async (userId: string) => {
    try {
      await api.post(`/admin/users/${userId}/unban`);
      toast.success('User unbanned');
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  if (user?.role !== 'admin') return null;

  return (
    <AppShell title="ADMIN PANEL">
      <div className="px-4 py-4 space-y-4">

        {/* Tabs */}
        <div className="flex gap-2">
          {['dashboard', 'users'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                tab === t ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? <PageLoader /> : (
          <>
            {tab === 'dashboard' && stats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total Users', value: formatNumber(stats.totalUsers), icon: '👥' },
                    { label: 'Banned', value: formatNumber(stats.bannedUsers), icon: '🚫' },
                    { label: 'Total Cases', value: formatNumber(stats.totalCases), icon: '📦' },
                    { label: 'Transactions', value: formatNumber(stats.totalTransactions), icon: '💸' },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="card p-3 text-center">
                      <div className="text-2xl">{icon}</div>
                      <div className="text-xl font-black text-white mt-1">{value}</div>
                      <div className="text-white/40 text-xs">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CoinIcon size={16} />
                    <span className="text-white/60 text-sm">Total Volume</span>
                  </div>
                  <div className="text-2xl font-black text-amber-400">{formatCoins(Number(stats.totalVolume))}</div>
                </div>

                <div>
                  <h3 className="font-bold text-white mb-3">Recent Users</h3>
                  <div className="space-y-2">
                    {(stats.recentUsers || []).map((u: any) => (
                      <div key={u.id} className="card flex items-center gap-3 p-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center font-bold text-sm">
                          {u.firstName?.[0] || u.username?.[0] || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{u.firstName || u.username || 'Anonymous'}</div>
                          <div className="text-white/30 text-xs">{new Date(u.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <CoinIcon size={12} />
                          <span className="text-amber-400 text-xs font-bold">{formatCoins(Number(u.wallet?.balance || 0))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 rounded-xl px-3 py-2 text-white outline-none border border-white/10"
                />
                <div className="space-y-2">
                  {users.filter((u) =>
                    !search || u.username?.includes(search) || u.firstName?.includes(search)
                  ).map((u) => (
                    <div key={u.id} className={`card flex items-center gap-3 p-3 ${u.isBanned ? 'border-red-500/30' : ''}`}>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{u.firstName || u.username || 'Anonymous'}</div>
                        <div className="text-white/30 text-xs">Lvl {u.level} | Cases: {u.totalCasesOpened}</div>
                        {u.isBanned && <div className="text-red-400 text-xs">BANNED: {u.banReason}</div>}
                      </div>
                      <div className="flex gap-1">
                        {u.isBanned ? (
                          <button onClick={() => unbanUser(u.id)} className="bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded-lg">
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const reason = prompt('Ban reason?');
                              if (reason) banUser(u.id, reason);
                            }}
                            className="bg-red-600/20 text-red-400 text-xs px-2 py-1 rounded-lg"
                          >
                            Ban
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
