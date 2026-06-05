'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

let globalSocket: Socket | null = null;

export function useSocket() {
  const { token, isAuthenticated, updateBalance } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (!token || !isAuthenticated) return;
    if (globalSocket?.connected) {
      socketRef.current = globalSocket;
      return;
    }

    const socket = io(WS_URL, {
      path: '/ws',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.debug('[WS] Connected');
    });

    socket.on('disconnect', (reason) => {
      console.debug('[WS] Disconnected:', reason);
    });

    socket.on('balance_update', ({ balance }: { balance: number }) => {
      updateBalance(balance);
    });

    socket.on('achievement_unlocked', (achievement: {
      name: string;
      icon: string;
      xpReward: number;
      coinReward: number;
    }) => {
      toast.custom(
        () => (
          <div className="bg-surface-800 border border-brand-500/40 rounded-xl p-4 flex items-center gap-3 shadow-lg max-w-sm">
            <span className="text-3xl">{achievement.icon}</span>
            <div>
              <p className="text-brand-400 font-bold text-sm">Achievement Unlocked!</p>
              <p className="text-white font-semibold">{achievement.name}</p>
              <p className="text-surface-400 text-xs">+{achievement.xpReward} XP · +{achievement.coinReward.toLocaleString()} coins</p>
            </div>
          </div>
        ),
        { duration: 5000, position: 'top-center' },
      );
    });

    socket.on('mission_completed', (mission: { title: string; coinReward: number }) => {
      toast.success(`Mission complete: ${mission.title}! +${mission.coinReward} coins`, {
        duration: 4000,
        icon: '🎯',
      });
    });

    socket.on('level_up', (data: { level: number }) => {
      toast.success(`Level Up! You are now level ${data.level}`, {
        duration: 4000,
        icon: '⬆️',
      });
    });

    socket.on('vip_upgrade', (data: { tier: string }) => {
      toast.success(`VIP Upgrade! You are now ${data.tier.toUpperCase()}`, {
        duration: 5000,
        icon: '👑',
      });
    });

    socket.on('prestige_achieved', (data: { prestigeLevel: number; coinBonus: number }) => {
      toast.custom(
        () => (
          <div className="bg-gradient-to-r from-yellow-900/80 to-amber-800/80 border border-yellow-500/60 rounded-xl p-4 text-center shadow-xl">
            <p className="text-2xl mb-1">✨</p>
            <p className="text-yellow-300 font-bold">Prestige {data.prestigeLevel} Achieved!</p>
            <p className="text-yellow-100 text-sm">+{data.coinBonus.toLocaleString()} bonus coins</p>
          </div>
        ),
        { duration: 6000, position: 'top-center' },
      );
    });

    socket.on('pending_notifications', (notifications: any[]) => {
      notifications.forEach((n) => {
        if (n?.type === 'achievement') {
          socket.emit('achievement_unlocked', n);
        }
      });
    });

    globalSocket = socket;
    socketRef.current = socket;
  }, [token, isAuthenticated, updateBalance]);

  useEffect(() => {
    connect();

    return () => {
      // Don't disconnect on component unmount — keep global socket alive
    };
  }, [connect]);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const isConnected = socketRef.current?.connected ?? false;

  return { socket: socketRef.current, emit, isConnected };
}
