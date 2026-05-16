import { Box, Badge, Text, VStack, HStack, Heading } from '@chakra-ui/react'
import { CircuitState, DataConfidence, FeedMode } from '@ledn/shared'
import { usePrices, useFeedModes, useCircuitStates } from '../../hooks/usePrices'

type RenderablePrice = {
  value?: number
  price?: number
  confidence?: DataConfidence
  ageMs?: number
  source?: string
}

const confidenceColor = (confidence: DataConfidence) => {
  switch (confidence) {
    case DataConfidence.FRESH: return 'green'
    case DataConfidence.STALE: return 'yellow'
    case DataConfidence.ESTIMATED: return 'red'
  }
}

const modeColor = (mode: FeedMode) => {
  switch (mode) {
    case FeedMode.HEALTHY: return 'green'
    case FeedMode.DELAYED: return 'yellow'
    case FeedMode.DRIFTED: return 'orange'
    case FeedMode.OFFLINE: return 'red'
  }
}

const circuitColor = (state: CircuitState) => {
  switch (state) {
    case CircuitState.CLOSED: return 'green'
    case CircuitState.HALF_OPEN: return 'orange'
    case CircuitState.OPEN: return 'red'
  }
}

const getPriceValue = (price: RenderablePrice | undefined) =>
  price?.value ?? price?.price

const formatPrice = (price: RenderablePrice | undefined) => {
  const value = getPriceValue(price)
  return typeof value === 'number'
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    : '—'
}

export function FeedHealthPanel() {
  const prices = usePrices()
  const feedModes = useFeedModes()
  const circuitStates = useCircuitStates()
  const assets = ['BTC', 'ETH']

  return (
    <Box
      p={4}
      borderWidth={1}
      borderColor="#d7dce8"
      _dark={{ borderColor: '#262626', bg: '#0a0a0a' }}
      borderRadius="md"
      bg="#ffffff"
      w="100%"
    >
      <HStack justify="space-between" mb={4}>
        <Heading size="sm" textTransform="uppercase" fontWeight="500" color="#344054" _dark={{ color: '#d4d4d4' }}>
          Market Feed Health
        </Heading>
        <Badge colorPalette="green" variant="plain" px={2} py={1} borderRadius="md">
          All systems nominal
        </Badge>
      </HStack>
      <VStack align="stretch" gap={3}>
        {assets.map((assetId) => {
          const price = prices[assetId] as RenderablePrice | undefined
          const mode = feedModes[assetId] ?? FeedMode.HEALTHY
          const circuitState = circuitStates[assetId] ?? CircuitState.CLOSED

          return (
            <Box
              key={assetId}
              p={4}
              borderWidth={1}
              borderColor="#d7dce8"
              _dark={{ borderColor: '#262626', bg: '#111111' }}
              borderRadius="md"
              bg="#ffffff"
            >
              <HStack justify="space-between" align="start" mb={3}>
                <Text fontSize="lg" fontWeight="800" letterSpacing="-0.04em">
                  {assetId}/USD
                </Text>
                <HStack gap={2}>
                  <Badge colorPalette={modeColor(mode)} borderRadius="full" px={2} py={1}>
                    {mode}
                  </Badge>
                  <Badge colorPalette={circuitColor(circuitState)} borderRadius="full" px={2} py={1}>
                    CB {circuitState}
                  </Badge>
                </HStack>
              </HStack>
              <Text fontSize="2xl" fontWeight="800" fontFamily="mono" letterSpacing="-0.06em">
                {formatPrice(price)}
              </Text>
              <HStack justify="space-between" mt={3}>
                {price?.confidence && (
                  <Text
                    fontSize="sm"
                    color={`${confidenceColor(price.confidence)}.600`}
                    fontWeight="800"
                  >
                    {price.confidence}
                  </Text>
                )}
                {price && (
                    <Text fontSize="sm" color="#667085" _dark={{ color: '#a3a3a3' }}>
                    Latency: {price.ageMs ?? '—'}ms · {price.source ?? 'UNKNOWN'}
                  </Text>
                )}
              </HStack>
            </Box>
          )
        })}
      </VStack>
    </Box>
  )
}
