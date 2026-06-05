import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Wallet } from '@/types';
import { authApi, usersApi, setAuthToken, getStoredToken } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (initData: string, referralCode?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateBalance: (balance: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (initData: string, referralCode?: string) => {
        set({ isLoading: true });
        try {
          const result = await authApi.telegramLogin(initData, referralCode);
          const { user, token } = result as any;
          setAuthToken(token);
          set({ user, token, isAuthenticated: true, isLoading: false });

          // Fetch full profile
          try {
            const profile = await usersApi.getProfile();
            set({ user: { ...user, ...profile as any } });
          } catch {}
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      refreshUser: async () => {
        const token = get().token || getStoredToken();
        if (!token) return;
        setAuthToken(token);
        try {
          const profile = await usersApi.getProfile();
          set({ user: profile as any, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      updateBalance: (balance: number) => {
        const user = get().user;
        if (user && user.wallet) {
          set({ user: { ...user, wallet: { ...user.wallet, balance } } });
        }
      },

      logout: () => {
        setAuthToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'blastcrates-auth',
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
