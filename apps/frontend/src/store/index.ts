import { create } from 'zustand'
import type {
  PriceRecord,
  LiquiditySnapshot,
  Alert,
} from '@ledn/shared'

import {
  CircuitState,
  FeedMode,
} from '@ledn/shared'

interface AppStore {
  // Prices
  prices: Record<string, PriceRecord>
  setPrices: (prices: Record<string, PriceRecord>) => void
  updatePrice: (assetId: string, price: PriceRecord) => void

  // Circuit breaker
  circuitStates: Record<string, CircuitState>
  setCircuitState: (assetId: string, state: CircuitState) => void

  // Feed status
  feedModes: Record<string, FeedMode>
  setFeedMode: (assetId: string, mode: FeedMode) => void

  // Liquidity
  liquidity: LiquiditySnapshot | null
  setLiquidity: (liquidity: LiquiditySnapshot) => void

  // Alerts
  alerts: Alert[]
  addAlert: (alert: Alert) => void
  resolveAlert: (id: string) => void

  // Connection
  connected: boolean
  setConnected: (connected: boolean) => void
}

export const useStore = create<AppStore>((set) => ({
  prices: {},
  setPrices: (prices) => set({ prices }),
  updatePrice: (assetId, price) =>
    set((s) => ({ prices: { ...s.prices, [assetId]: price } })),

  circuitStates: {},
  setCircuitState: (assetId, state) =>
    set((s) => ({ circuitStates: { ...s.circuitStates, [assetId]: state } })),

  feedModes: {},
  setFeedMode: (assetId, mode) =>
    set((s) => ({ feedModes: { ...s.feedModes, [assetId]: mode } })),

  liquidity: null,
  setLiquidity: (liquidity) => set({ liquidity }),

  alerts: [],
  addAlert: (alert) =>
    set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 50) })),
  resolveAlert: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) =>
        a.id === id ? { ...a, resolved: true } : a,
      ),
    })),

  connected: false,
  setConnected: (connected) => set({ connected }),
}))