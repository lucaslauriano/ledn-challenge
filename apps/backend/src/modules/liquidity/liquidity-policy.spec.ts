import { applyLiquidityPolicy } from './liquidity-policy'

describe('applyLiquidityPolicy', () => {
  it('does not adjust availability when no assets are degraded', () => {
    const result = applyLiquidityPolicy({
      available: 1000,
      degradedAssets: [],
    })

    expect(result).toEqual({
      conservativeMode: false,
      availableAdjusted: 1000,
    })
  })

  it('applies a 10% haircut when any asset is degraded', () => {
    const result = applyLiquidityPolicy({
      available: 1000,
      degradedAssets: ['BTC'],
    })

    expect(result).toEqual({
      conservativeMode: true,
      availableAdjusted: 900,
    })
  })
})
