'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav } from './BottomNav';
import { useAuthStore } from '@/store/auth.store';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { formatCoins } from '@/lib/utils';

interface Props {
  children: ReactNode;
  title?: string;
  showBalance?: boolean;
  className?: string;
}

export function AppShell({ children, title, showBalance = true, className = '' }: Props) {
  const { user, isAuthenticated, refreshUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0b12] pb-24">
      {/* Top bar */}
      {(title || showBalance) && (
        <header className="sticky top-0 z-40 bg-[#0a0b12]/90 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
            {title && (
              <h1 className="text-lg font-bold gradient-text font-display">{title}</h1>
            )}
            {!title && <div />}
            {showBalance && user?.wallet && (
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5">
                <CoinIcon size={18} />
                <span className="font-bold text-sm text-white">
                  {formatCoins(Number(user.wallet.balance))}
                </span>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Content */}
      <main className={`max-w-md mx-auto ${className}`}>
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
