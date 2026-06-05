'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { casesApi } from '@/lib/api';
import { Case, CaseCategory } from '@/types';
import { formatCoins, cn } from '@/lib/utils';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { PageLoader } from '@/components/ui/LoadingSpinner';

const CATEGORIES: { label: string; value: CaseCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Starter', value: 'starter' },
  { label: 'Premium', value: 'premium' },
  { label: 'Epic', value: 'epic' },
  { label: 'Legendary', value: 'legendary' },
  { label: 'Event', value: 'event' },
];

const CATEGORY_COLORS: Record<string, string> = {
  starter: 'from-slate-600 to-slate-800',
  premium: 'from-blue-700 to-blue-900',
  epic: 'from-purple-700 to-purple-900',
  legendary: 'from-amber-600 to-amber-900',
  limited: 'from-red-700 to-red-900',
  event: 'from-green-700 to-green-900',
};

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CaseCategory | 'all'>('all');

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await casesApi.getAll();
      setCases(data as any || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const filtered = activeCategory === 'all'
    ? cases
    : cases.filter((c) => c.category === activeCategory);

  return (
    <AppShell title="CASES">
      <div className="px-4 py-4 space-y-4">

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={cn(
                'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                activeCategory === cat.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/10 text-white/60 hover:text-white',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <div className="text-4xl mb-3">📦</div>
            <p>No cases available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/cases/${c.id}`} className="block">
                  <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${CATEGORY_COLORS[c.category] || 'from-slate-700 to-slate-900'} border border-white/10 hover:border-violet-500/40 transition-all duration-200`}>
                    {c.isFeatured && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-xs font-bold px-2 py-0.5 rounded-full text-black">
                        HOT
                      </div>
                    )}

                    {/* Case image / icon */}
                    <div className="h-32 flex items-center justify-center">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt={c.name} className="h-24 object-contain" />
                      ) : (
                        <div className="relative">
                          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                              <path d="M5 12L20 5L35 12V28L20 35L5 28V12Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.1)"/>
                              <circle cx="20" cy="20" r="5" fill="white" opacity="0.8"/>
                            </svg>
                          </div>
                          <div className="absolute inset-0 blur-xl bg-white/20 rounded-full" />
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-black/30">
                      <h3 className="font-bold text-sm text-white truncate">{c.name}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-white/40 text-xs capitalize">{c.category}</span>
                        <div className="flex items-center gap-1">
                          <CoinIcon size={12} />
                          <span className="text-amber-400 font-bold text-sm">{formatCoins(Number(c.price))}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-white/30 text-xs">{c.totalOpened?.toLocaleString() || 0} opened</div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
