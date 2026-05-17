const CONSERVATIVE_HAIRCUT = 0.1

export interface LiquidityPolicyInput {
  available: number
  degradedAssets: string[]
}

export interface LiquidityPolicyResult {
  conservativeMode: boolean
  availableAdjusted: number
}

export function applyLiquidityPolicy({
  available,
  degradedAssets,
}: LiquidityPolicyInput): LiquidityPolicyResult {
  const conservativeMode = degradedAssets.length > 0
  const availableAdjusted = conservativeMode
    ? available * (1 - CONSERVATIVE_HAIRCUT)
    : available

  return {
    conservativeMode,
    availableAdjusted: parseFloat(availableAdjusted.toFixed(2)),
  }
}
