import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../lib/db'

export interface Entry {
  id: string
  text: string
  amount?: number
  token?: string
  timestamp: number
  type: 'log' | 'system' | 'price_alert'
}

export interface Dashboard {
  id: string
  name: string
  entries: Entry[]
  createdAt: number
}

export interface TrackedToken {
  id: string
  symbol: string
  name: string
  address?: string
  chain?: string
  source: 'coingecko' | 'dexscreener'
  currentPrice?: number
  priceChange24h?: number
  lastUpdated?: number
}

export interface PricePoint {
  time: number
  value: number
}

interface Store {
  // State
  dashboards: Dashboard[]
  activeDashboardId: string | null
  watchlist: TrackedToken[]
  priceHistory: Record<string, PricePoint[]>
  chatMessages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>
  isOllamaAvailable: boolean

  // Dashboard actions
  createDashboard: (name: string) => Dashboard
  deleteDashboard: (id: string) => void
  setActiveDashboard: (id: string | null) => void
  addEntry: (dashboardId: string, entry: Omit<Entry, 'id'>) => void

  // Watchlist actions
  addToken: (token: Omit<TrackedToken, 'currentPrice' | 'priceChange24h' | 'lastUpdated'>) => void
  removeToken: (id: string) => void
  updateTokenPrice: (id: string, price: number, change24h: number) => void
  setPriceHistory: (tokenId: string, points: PricePoint[]) => void

  // Chat actions
  addChatMessage: (role: 'user' | 'assistant', content: string) => void

  // Settings
  setOllamaAvailable: (available: boolean) => void
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      dashboards: [],
      activeDashboardId: null,
      watchlist: [],
      priceHistory: {},
      chatMessages: [],
      isOllamaAvailable: false,

      createDashboard: (name: string) => {
        const dashboard: Dashboard = {
          id: generateId(),
          name,
          entries: [],
          createdAt: Date.now(),
        }
        set((state) => ({
          dashboards: [...state.dashboards, dashboard],
          activeDashboardId: dashboard.id,
        }))
        db.saveDashboard(dashboard)
        return dashboard
      },

      deleteDashboard: (id: string) => {
        set((state) => ({
          dashboards: state.dashboards.filter((d) => d.id !== id),
          activeDashboardId: state.activeDashboardId === id
            ? (state.dashboards.find((d) => d.id !== id)?.id ?? null)
            : state.activeDashboardId,
        }))
        db.deleteDashboard(id)
      },

      setActiveDashboard: (id: string | null) => {
        set({ activeDashboardId: id })
      },

      addEntry: (dashboardId: string, entryData: Omit<Entry, 'id'>) => {
        const entry: Entry = { ...entryData, id: generateId() }
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id === dashboardId
              ? { ...d, entries: [...d.entries, entry] }
              : d,
          ),
        }))
        db.saveEntry(dashboardId, entry)
      },

      addToken: (tokenData) => {
        const existing = get().watchlist.find((t) => t.id === tokenData.id)
        if (existing) return
        const token: TrackedToken = { ...tokenData }
        set((state) => ({
          watchlist: [...state.watchlist, token],
        }))
        db.saveToken(token)
      },

      removeToken: (id: string) => {
        set((state) => ({
          watchlist: state.watchlist.filter((t) => t.id !== id),
        }))
        db.deleteToken(id)
      },

      updateTokenPrice: (id: string, price: number, change24h: number) => {
        set((state) => ({
          watchlist: state.watchlist.map((t) =>
            t.id === id
              ? { ...t, currentPrice: price, priceChange24h: change24h, lastUpdated: Date.now() }
              : t,
          ),
        }))
      },

      setPriceHistory: (tokenId: string, points: PricePoint[]) => {
        set((state) => ({
          priceHistory: { ...state.priceHistory, [tokenId]: points },
        }))
      },

      addChatMessage: (role, content) => {
        set((state) => ({
          chatMessages: [
            ...state.chatMessages.slice(-99),
            { role, content, timestamp: Date.now() },
          ],
        }))
      },

      setOllamaAvailable: (available: boolean) => {
        set({ isOllamaAvailable: available })
      },
    }),
    {
      name: 'meridian-store',
      partialize: (state) => ({
        dashboards: state.dashboards,
        activeDashboardId: state.activeDashboardId,
        watchlist: state.watchlist,
        chatMessages: state.chatMessages.slice(-50),
      }),
    },
  ),
)
