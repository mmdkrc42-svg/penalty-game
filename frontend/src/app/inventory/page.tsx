'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { inventoryApi } from '@/lib/api';
import { InventoryItem } from '@/types';
import { formatCoins, cn } from '@/lib/utils';
import { ItemCard } from '@/components/ui/ItemCard';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

type Filter = 'all' | 'active' | 'sold';

export default function InventoryPage() {
  const { refreshUser } = useAuthStore();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('active');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selling, setSelling] = useState(false);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => { loadInventory(); }, [filter]);

  const loadInventory = async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const data = await inventoryApi.getInventory(filter === 'all' ? undefined : filter);
      const result = data as any;
      setItems(result.items || []);
      setTotalValue(result.totalValue || 0);
    } catch {} finally { setLoading(false); }
  };

  const toggleSelect = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.status !== 'active') return;
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    const activeIds = items.filter((i) => i.status === 'active').map((i) => i.id);
    setSelected(new Set(activeIds));
  };

  const sellSelected = async () => {
    if (selected.size === 0 || selling) return;
    setSelling(true);
    try {
      const result = await inventoryApi.sellMultiple(Array.from(selected));
      const data = result as any;
      toast.success(`Sold ${data.soldCount} items for ${formatCoins(data.totalCoins)} coins!`);
      await refreshUser();
      loadInventory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to sell');
    } finally { setSelling(false); }
  };

  const selectedValue = items
    .filter((i) => selected.has(i.id))
    .reduce((sum, i) => sum + Math.floor(Number(i.value) * 0.85), 0);

  return (
    <AppShell title="INVENTORY">
      <div className="px-4 py-4 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3 text-center">
            <div className="text-xl font-black text-white">{items.length}</div>
            <div className="text-white/40 text-xs">Items</div>
          </div>
          <div className="card p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <CoinIcon size={14} />
              <span className="text-xl font-black text-amber-400">{formatCoins(totalValue)}</span>
            </div>
            <div className="text-white/40 text-xs">Total Value</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'active', 'sold'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-2 rounded-xl text-sm font-medium transition-all',
                filter === f ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/60',
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Sell bar */}
        <AnimatePresence>
          {filter === 'active' && items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <button onClick={selectAll} className="btn-secondary text-xs py-2 px-3">
                Select All
              </button>
              {selected.size > 0 && (
                <button
                  onClick={sellSelected}
                  disabled={selling}
                  className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2"
                >
                  <CoinIcon size={14} />
                  Sell {selected.size} for {formatCoins(selectedValue)}
                </button>
              )}
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())} className="btn-secondary text-xs py-2 px-3">
                  Clear
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items grid */}
        {loading ? (
          <PageLoader />
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <div className="text-4xl mb-3">🎒</div>
            <p>No items found</p>
            <p className="text-sm mt-1">Open some cases to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
              >
                <ItemCard
                  item={item}
                  selected={selected.has(item.id)}
                  onClick={() => toggleSelect(item.id)}
                  className={item.status !== 'active' ? 'opacity-50' : ''}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
