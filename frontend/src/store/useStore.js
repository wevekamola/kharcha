import { create } from 'zustand';

export const useStore = create((set) => ({
  token:    localStorage.getItem('kh_token') || null,
  user:     null,
  accounts: [],

  setAuth: (token, user) => {
    localStorage.setItem('kh_token', token);
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('kh_token');
    set({ token: null, user: null, accounts: [] });
  },

  setAccounts: (accounts) => set({ accounts }),
}));
