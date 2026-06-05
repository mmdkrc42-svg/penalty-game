import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ItemRarity } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCoins(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toString();
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export function getRarityColor(rarity: ItemRarity): string {
  const colors: Record<ItemRarity, string> = {
    common: '#9ca3af',
    uncommon: '#22c55e',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
    mythic: '#ef4444',
  };
  return colors[rarity] || '#9ca3af';
}

export function getRarityGlow(rarity: ItemRarity): string {
  const glows: Record<ItemRarity, string> = {
    common: 'shadow-[0_0_15px_rgba(156,163,175,0.3)]',
    uncommon: 'shadow-[0_0_15px_rgba(34,197,94,0.4)]',
    rare: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
    epic: 'shadow-[0_0_25px_rgba(168,85,247,0.6)]',
    legendary: 'shadow-[0_0_30px_rgba(245,158,11,0.7)]',
    mythic: 'shadow-[0_0_35px_rgba(239,68,68,0.8)]',
  };
  return glows[rarity] || '';
}

export function getRarityBorder(rarity: ItemRarity): string {
  const borders: Record<ItemRarity, string> = {
    common: 'border-gray-500',
    uncommon: 'border-green-500',
    rare: 'border-blue-500',
    epic: 'border-purple-500',
    legendary: 'border-amber-500',
    mythic: 'border-red-500',
  };
  return borders[rarity] || 'border-gray-500';
}

export function getRarityBg(rarity: ItemRarity): string {
  const bgs: Record<ItemRarity, string> = {
    common: 'from-gray-900 to-gray-800',
    uncommon: 'from-green-950 to-gray-900',
    rare: 'from-blue-950 to-gray-900',
    epic: 'from-purple-950 to-gray-900',
    legendary: 'from-amber-950 to-gray-900',
    mythic: 'from-red-950 to-gray-900',
  };
  return bgs[rarity] || 'from-gray-900 to-gray-800';
}

export function getRarityLabel(rarity: ItemRarity): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

export function timeUntil(date: string): string {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return 'Now';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
