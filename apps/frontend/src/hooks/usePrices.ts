import { useStore } from '../store'

export function usePrices() {
  return useStore((s) => s.prices)
}

export function usePrice(assetId: string) {
  return useStore((s) => s.prices[assetId])
}

export function useFeedModes() {
  return useStore((s) => s.feedModes)
}

export function useCircuitStates() {
  return useStore((s) => s.circuitStates)
}