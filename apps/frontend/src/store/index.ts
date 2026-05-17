import { create } from 'zustand'
import type {
  PriceRecord,
  LiquiditySnapshot,
  AlertEvent,
  SettlementSnapshot,
} from '@ledn/shared'

import {
  CircuitState,
  FeedMode,
  FeedScenario,
} from '@ledn/shared'

type ActiveSimulation = {
  scenario: FeedScenario
  label: string
}

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

  // Settlements
  settlements: SettlementSnapshot | null
  setSettlements: (settlements: SettlementSnapshot) => void

  // Alerts
  alerts: AlertEvent[]
  addAlert: (alert: AlertEvent) => void
  resolveAlert: (id: string) => void

  // Connection
  connected: boolean
  setConnected: (connected: boolean) => void

  // Simulation
  activeSimulation: ActiveSimulation | null
  setActiveSimulation: (simulation: ActiveSimulation) => void
  clearActiveSimulation: () => void
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

  settlements: null,
  setSettlements: (settlements) => set({ settlements }),

  alerts: [],
  addAlert: (alert) =>
    set((s) => ({
      alerts: [alert, ...s.alerts.filter((item) => item.id !== alert.id)].slice(
        0,
        50,
      ),
    })),
  resolveAlert: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) =>
        a.id === id ? { ...a, isActive: false, resolvedAt: Date.now() } : a,
      ),
    })),

  connected: false,
  setConnected: (connected) => set({ connected }),

  activeSimulation: null,
  setActiveSimulation: (simulation) => set({ activeSimulation: simulation }),
  clearActiveSimulation: () => set({ activeSimulation: null }),
}))
