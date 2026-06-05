'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { casesApi } from '@/lib/api';
import { Case, CaseItem, InventoryItem } from '@/types';
import { formatCoins, getRarityColor, cn } from '@/lib/utils';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { ItemCard } from '@/components/ui/ItemCard';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/store/auth.store';
import { useTelegram } from '@/hooks/useTelegram';
import toast from 'react-hot-toast';

type Phase = 'idle' | 'spinning' | 'result';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { haptic } = useTelegram();
  const { user, refreshUser } = useAuthStore();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [wonItem, setWonItem] = useState<InventoryItem | null>(null);
  const [spinItems, setSpinItems] = useState<CaseItem[]>([]);
  const [spinOffset, setSpinOffset] = useState(0);
  const reelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    casesApi.getOne(id).then((data) => {
      setCaseData(data as any);
      setLoading(false);
    }).catch(() => { router.back(); setLoading(false); });
  }, [id]);

  const buildSpinItems = (items: CaseItem[], targetItem: CaseItem): CaseItem[] => {
    const filler: CaseItem[] = [];
    for (let i = 0; i < 40; i++) {
      filler.push(items[Math.floor(Math.random() * items.length)]);
    }
    filler[35] = targetItem;
    return filler;
  };

  const handleOpen = async () => {
    if (phase !== 'idle' || !caseData) return;
    const balance = Number(user?.wallet?.balance || 0);
    if (balance < Number(caseData.price)) {
      toast.error('Insufficient balance!');
      haptic.error();
      return;
    }

    haptic.medium();
    setPhase('spinning');
    setWonItem(null);

    try {
      const result = await casesApi.openCase(id);
      const data = result as any;
      const won: InventoryItem = data.item;

      const activeItems = caseData.items.filter((i) => i.active !== false);
      const wonCaseItem = activeItems.find((i) => i.id === won.caseItemId) || activeItems[0];
      const spinList = buildSpinItems(activeItems, wonCaseItem);
      setSpinItems(spinList);

      setTimeout(() => {
        setPhase('result');
        setWonItem(won);
        haptic.success();
        refreshUser();
      }, 3200);
    } catch (err: any) {
      toast.error(err.message || 'Failed to open case');
      haptic.error();
      setPhase('idle');
    }
  };

  if (loading) return <AppShell><PageLoader /></AppShell>;
  if (!caseData) return null;

  const ITEM_W = 120;
  const VISIBLE = 5;
  const CENTER = Math.floor(VISIBLE / 2);

  return (
    <AppShell>
      <div className="px-4 py-4 space-y-4">
        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-white/60 text-sm">
          ← Back to Cases
        </button>

        {/* Case header */}
        <div className="text-center">
          <h1 className="text-2xl font-black gradient-text font-display">{caseData.name}</h1>
          {caseData.description && <p className="text-white/40 text-sm mt-1">{caseData.description}</p>}
        </div>

        {/* Case visual */}
        <div className="flex justify-center">
          <motion.div
            animate={phase === 'spinning' ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 0.5, repeat: phase === 'spinning' ? Infinity : 0 }}
            className="w-40 h-40 rounded-3xl bg-gradient-to-br from-violet-700 to-purple-900 flex items-center justify-center shadow-[0_0_60px_rgba(124,58,237,0.5)] border border-violet-500/30"
          >
            <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
              <path d="M10 25L35 10L60 25V45L35 60L10 45V25Z" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.1)"/>
              <circle cx="35" cy="35" r="10" fill="white" opacity="0.8"/>
              <path d="M35 10V60M10 25L60 45M60 25L10 45" stroke="white" strokeWidth="1" opacity="0.3"/>
            </svg>
          </motion.div>
        </div>

        {/* Spin reel */}
        <AnimatePresence>
          {phase === 'spinning' && spinItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative overflow-hidden rounded-2xl border border-violet-500/30"
            >
              {/* Center marker */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-violet-400 z-10" />
              <div className="absolute left-1/2 -translate-x-1/2 top-0 border-8 border-t-violet-400 border-x-transparent border-b-transparent z-10" style={{ borderWidth: '8px 5px 0' }} />

              <motion.div
                className="flex gap-2 py-2 px-4"
                animate={{ x: -(35 * (ITEM_W + 8)) + CENTER * (ITEM_W + 8) }}
                transition={{ duration: 3, ease: [0.12, 0.68, 0.15, 1] }}
                ref={reelRef}
              >
                {spinItems.map((item, i) => (
                  <div key={i} className="flex-shrink-0 w-28">
                    <ItemCard item={item} showValue={false} />
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Won item */}
        <AnimatePresence>
          {phase === 'result' && wonItem && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.4 }}
              className="text-center space-y-3"
            >
              <h2 className="text-xl font-bold text-white">You won!</h2>
              <div className="flex justify-center">
                <div className="w-48">
                  <ItemCard item={wonItem} />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPhase('idle')}
                  className="flex-1 btn-secondary text-sm py-2"
                >
                  Keep Item
                </button>
                <button
                  onClick={handleOpen}
                  className="flex-1 btn-primary text-sm py-2"
                >
                  Open Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Open button */}
        {phase === 'idle' && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleOpen}
            className="w-full btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2"
          >
            <CoinIcon size={20} />
            Open for {formatCoins(Number(caseData.price))}
          </motion.button>
        )}

        {/* Items list */}
        {phase === 'idle' && (
          <div>
            <h3 className="font-bold text-white mb-3">Possible Items</h3>
            <div className="grid grid-cols-3 gap-2">
              {caseData.items.filter((i) => i.active !== false).map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
