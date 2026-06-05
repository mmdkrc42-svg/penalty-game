import { ItemRarity } from '@/types';
import { getRarityColor, getRarityLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Props {
  rarity: ItemRarity;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RarityBadge({ rarity, className, size = 'sm' }: Props) {
  const color = getRarityColor(rarity);
  const sizeClasses = { sm: 'text-[10px] px-2 py-0.5', md: 'text-xs px-2.5 py-1', lg: 'text-sm px-3 py-1.5' };

  return (
    <span
      className={cn('rounded-full font-semibold border uppercase tracking-wide', sizeClasses[size], className)}
      style={{ color, borderColor: color, background: `${color}20` }}
    >
      {getRarityLabel(rarity)}
    </span>
  );
}
