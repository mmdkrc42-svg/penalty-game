'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/hooks/useTelegram';
import { useAuthStore } from '@/store/auth.store';
import { authApi, setAuthToken } from '@/lib/api';
import toast from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const { tg, initData, startParam, isReady } = useTelegram();
  const { login, token, isAuthenticated, refreshUser } = useAuthStore();

  useEffect(() => {
    if (!isReady) return;

    const doAuth = async () => {
      try {
        if (token && isAuthenticated) {
          await refreshUser();
          router.replace('/home');
          return;
        }

        if (initData) {
          await login(initData, startParam || undefined);
          router.replace('/home');
        } else {
          // Dev mode fallback
          if (process.env.NODE_ENV === 'development') {
            await login('dev_mode_init_data');
            router.replace('/home');
          }
        }
      } catch (err: any) {
        toast.error(err.message || 'Authentication failed');
        setTimeout(() => doAuth(), 3000);
      }
    };

    doAuth();
  }, [isReady]);

  return (
    <div className="min-h-screen bg-[#0a0b12] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-[0_0_60px_rgba(124,58,237,0.5)]">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M8 16L24 8L40 16V32L24 40L8 32V16Z" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.1)"/>
              <path d="M24 8V40M8 16L40 32M40 16L8 32" stroke="white" strokeWidth="1.5" opacity="0.5"/>
              <circle cx="24" cy="24" r="6" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-brand-600/20 blur-xl" />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight gradient-text font-display">
            BLASTCRATES
          </h1>
          <p className="text-white/40 text-sm mt-1">Open cases. Win big.</p>
        </div>

        {/* Loading */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-white/30 text-xs">Authenticating...</p>
      </div>
    </div>
  );
}
