'use client';
import { motion } from 'framer-motion';
import { InventoryItem, CaseItem } from '@/types';
import { getRarityColor, getRarityGlow, getRarityBorder, getRarityBg, formatCoins, cn } from '@/lib/utils';
import { RarityBadge } from './RarityBadge';
import { CoinIcon } from './CoinIcon';

interface Props {
  item: InventoryItem | CaseItem;
  selected?: boolean;
  onClick?: () => void;
  showValue?: boolean;
  className?: string;
}

export function ItemCard({ item, selected, onClick, showValue = true, className }: Props) {
  const color = getRarityColor(item.rarity);
  const bg = getRarityBg(item.rarity);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-200',
        getRarityBorder(item.rarity),
        selected && 'ring-2 ring-offset-2 ring-offset-[#0a0b12]',
        onClick && 'active:scale-95',
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${color}15, transparent)`,
        borderColor: selected ? color : `${color}60`,
        boxShadow: selected ? `0 0 20px ${color}50` : undefined,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}60, transparent 70%)` }}
      />

      <div className="relative p-3 flex flex-col items-center gap-2">
        {/* Image or icon */}
        <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-black/30">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain rounded-xl" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}30` }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
                <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
              </svg>
            </div>
          )}
        </div>

        <RarityBadge rarity={item.rarity} size="sm" />
        <p className="text-xs font-semibold text-white/90 text-center leading-tight line-clamp-2">{item.name}</p>

        {showValue && (
          <div className="flex items-center gap-1">
            <CoinIcon size={12} />
            <span className="text-xs font-bold text-amber-400">{formatCoins(Number(item.value))}</span>
          </div>
        )}
      </div>

      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2">
            <polyline points="2 6 5 9 10 3"/>
          </svg>
        </div>
      )}
    </motion.div>
  );
}
