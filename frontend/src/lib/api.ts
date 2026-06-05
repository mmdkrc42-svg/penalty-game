import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) localStorage.setItem('bc_token', token);
  else localStorage.removeItem('bc_token');
};

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bc_token');
};

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: `${API_URL}/api/v1`,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config) => {
    const token = authToken || getStoredToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response.data?.data ?? response.data,
    (error) => {
      const message =
        error.response?.data?.message || error.message || 'Request failed';
      return Promise.reject(new Error(message));
    },
  );

  return client;
};

export const api = createApiClient();

// Auth
export const authApi = {
  telegramLogin: (initData: string, referralCode?: string) =>
    api.post('/auth/telegram', { initData, referralCode }),
  getMe: () => api.get('/auth/me'),
};

// Users
export const usersApi = {
  getProfile: () => api.get('/users/me/profile'),
  getStats: () => api.get('/users/me/stats'),
  claimDaily: () => api.post('/users/me/daily'),
};

// Economy
export const economyApi = {
  getWallet: () => api.get('/economy/wallet'),
  getTransactions: (limit = 50, offset = 0) =>
    api.get(`/economy/transactions?limit=${limit}&offset=${offset}`),
};

// Cases
export const casesApi = {
  getAll: (category?: string) =>
    api.get(`/cases${category ? `?category=${category}` : ''}`),
  getOne: (id: string) => api.get(`/cases/${id}`),
  getStats: (id: string) => api.get(`/cases/${id}/stats`),
  openCase: (id: string) => api.post(`/cases/${id}/open`),
};

// Inventory
export const inventoryApi = {
  getInventory: (status?: string) =>
    api.get(`/inventory${status ? `?status=${status}` : ''}`),
  sellItem: (id: string) => api.post(`/inventory/${id}/sell`),
  sellMultiple: (itemIds: string[]) =>
    api.post('/inventory/sell-multiple', { itemIds }),
};

// Games
export const crashApi = {
  placeBet: (betAmount: number, autoCashOut?: number) =>
    api.post('/games/crash/bet', { betAmount, autoCashOut }),
  cashOut: (roundId: string, multiplier: number) =>
    api.post(`/games/crash/${roundId}/cashout`, { multiplier }),
  getHistory: () => api.get('/games/crash/history'),
};

export const coinflipApi = {
  flip: (betAmount: number, choice: 'heads' | 'tails') =>
    api.post('/games/coinflip/flip', { betAmount, choice }),
  getHistory: () => api.get('/games/coinflip/history'),
};

export const upgradeApi = {
  getTargets: (itemId: string) => api.get(`/games/upgrade/${itemId}/targets`),
  upgrade: (itemId: string, targetItemId: string) =>
    api.post(`/games/upgrade/${itemId}/upgrade`, { targetItemId }),
};

// Referrals
export const referralsApi = {
  getStats: () => api.get('/referrals/stats'),
  getLeaderboard: () => api.get('/referrals/leaderboard'),
};

// Leaderboard
export const leaderboardApi = {
  getTopEarners: () => api.get('/leaderboard/top-earners'),
  getTopCases: () => api.get('/leaderboard/top-cases'),
  getRichest: () => api.get('/leaderboard/richest'),
  getMyRank: () => api.get('/leaderboard/my-rank'),
};
