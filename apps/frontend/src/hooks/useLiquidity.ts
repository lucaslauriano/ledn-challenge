import { useStore } from '../store'

export function useLiquidity() {
  return useStore((s) => s.liquidity)
}