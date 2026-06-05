'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { inventoryApi, upgradeApi } from '@/lib/api';
import { InventoryItem } from '@/types';
import { formatCoins, getRarityColor, cn } from '@/lib/utils';
import { ItemCard } from '@/components/ui/ItemCard';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/store/auth.store';
import { useTelegram } from '@/hooks/useTelegram';
import toast from 'react-hot-toast';

type Phase = 'select_source' | 'select_target' | 'result';

export default function UpgradePage() {
  const { refreshUser } = useAuthStore();
  const { haptic } = useTelegram();
  const [phase, setPhase] = useState<Phase>('select_source');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [sourceItem, setSourceItem] = useState<InventoryItem | null>(null);
  const [targetItem, setTargetItem] = useState<any | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getInventory('active');
      setItems((data as any).items || []);
    } catch {} finally { setLoading(false); }
  };

  const selectSource = async (item: InventoryItem) => {
    setSourceItem(item);
    haptic.select();
    try {
      const data = await upgradeApi.getTargets(item.id);
      setTargets(data as any || []);
      setPhase('select_target');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const doUpgrade = async () => {
    if (!sourceItem || !targetItem || upgrading) return;
    haptic.medium();
    setUpgrading(true);
    try {
      const data = await upgradeApi.upgrade(sourceItem.id, targetItem.id);
      setResult(data);
      setPhase('result');
      if ((data as any).won) haptic.success();
      else haptic.error();
      refreshUser();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setUpgrading(false); }
  };

  const reset = () => {
    setPhase('select_source');
    setSourceItem(null);
    setTargetItem(null);
    setResult(null);
    loadItems();
  };

  return (
    <AppShell title="UPGRADE">
      <div className="px-4 py-4 space-y-4">

        {/* Progress steps */}
        <div className="flex items-center gap-2">
          {['Select Item', 'Pick Target', 'Result'].map((step, i) => {
            const phaseIdx = phase === 'select_source' ? 0 : phase === 'select_target' ? 1 : 2;
            return (
              <div key={step} className="flex items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                  i <= phaseIdx ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/40'
                )}>{i + 1}</div>
                <span className={cn('text-xs ml-1', i <= phaseIdx ? 'text-white' : 'text-white/30')}>{step}</span>
                {i < 2 && <div className={cn('flex-1 h-0.5 mx-2 w-8', i < phaseIdx ? 'bg-violet-600' : 'bg-white/10')} />}
              </div>
            );
          })}
        </div>

        {/* Select source */}
        {phase === 'select_source' && (
          <div>
            <p className="text-white/60 text-sm mb-3">Choose an item to upgrade from</p>
            {loading ? <PageLoader /> : items.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <div className="text-4xl mb-2">🎒</div>
                <p>No items in inventory</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} onClick={() => selectSource(item)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Select target */}
        {phase === 'select_target' && sourceItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 card p-3">
              <div className="w-20">
                <ItemCard item={sourceItem} />
              </div>
              <div className="text-2xl">→</div>
              {targetItem ? (
                <div className="w-20">
                  <ItemCard item={targetItem} />
                </div>
              ) : (
                <div className="flex-1 border-2 border-dashed border-white/20 rounded-2xl h-24 flex items-center justify-center text-white/30 text-sm">
                  Pick target
                </div>
              )}
            </div>

            {targetItem && (
              <div className="card p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Success Chance</span>
                  <span className="font-bold text-white">{(targetItem.successChance * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-white/10 rounded-full h-2">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                    style={{ width: `${targetItem.successChance * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/30">
                  <span>Value: {formatCoins(Number(sourceItem.value))}</span>
                  <span>Target: {formatCoins(Number(targetItem.value))}</span>
                </div>
              </div>
            )}

            <p className="text-white/60 text-sm">Choose your upgrade target</p>
            <div className="grid grid-cols-3 gap-2">
              {targets.map((t) => (
                <div key={t.id} className="relative">
                  <ItemCard
                    item={t}
                    selected={targetItem?.id === t.id}
                    onClick={() => setTargetItem(t)}
                  />
                  <div className="absolute bottom-1 left-1 right-1 bg-black/70 rounded-lg text-center text-xs py-0.5"
                    style={{ color: `hsl(${t.successChance * 120}, 80%, 60%)` }}>
                    {(t.successChance * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setPhase('select_source'); setTargetItem(null); }} className="btn-secondary py-3">
                ← Back
              </button>
              <button
                onClick={doUpgrade}
                disabled={!targetItem || upgrading}
                className="btn-primary py-3 font-bold"
              >
                {upgrading ? 'Upgrading...' : '⚡ Upgrade!'}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {phase === 'result' && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="text-6xl">{result.won ? '🎉' : '💔'}</div>
            <h2 className="text-2xl font-black text-white">
              {result.won ? 'Upgrade Successful!' : 'Upgrade Failed'}
            </h2>
            {result.won ? (
              <>
                <p className="text-white/60">You got:</p>
                <div className="flex justify-center">
                  <div className="w-40">
                    <ItemCard item={result.item} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-white/40">Both items were lost. Better luck next time!</p>
            )}
            <button onClick={reset} className="w-full btn-primary py-4">
              Try Again
            </button>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
