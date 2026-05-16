import { Box, Badge, Text, VStack, HStack, Heading, Separator } from '@chakra-ui/react'
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
  return typeof value === 'number' ? `$${value.toLocaleString()}` : '—'
}

export function FeedHealthPanel() {
  const prices = usePrices()
  const feedModes = useFeedModes()
  const circuitStates = useCircuitStates()
  const assets = ['BTC', 'ETH']

  return (
    <Box p={4} borderWidth={1} borderRadius="lg" w="100%">
      <Heading size="sm" mb={3}>Feed Health</Heading>
      <Separator mb={3} />
      <VStack align="stretch" gap={3}>
        {assets.map((assetId) => {
          const price = prices[assetId] as RenderablePrice | undefined
          const mode = feedModes[assetId] ?? FeedMode.HEALTHY
          const circuitState = circuitStates[assetId] ?? CircuitState.CLOSED

          return (
            <HStack key={assetId} justify="space-between">
              <HStack>
                <Text fontWeight="bold">{assetId}</Text>
                <Badge colorPalette={modeColor(mode)}>{mode}</Badge>
                <Badge colorPalette={circuitColor(circuitState)}>
                  CB {circuitState}
                </Badge>
              </HStack>
              <HStack>
                <Text fontSize="sm" color="gray.500">
                  {formatPrice(price)}
                </Text>
                {price?.confidence && (
                  <Badge colorPalette={confidenceColor(price.confidence)}>
                    {price.confidence}
                  </Badge>
                )}
                {price && (
                  <Text fontSize="xs" color="gray.400">
                    {price.ageMs ?? '—'}ms · {price.source ?? 'UNKNOWN'}
                  </Text>
                )}
              </HStack>
            </HStack>
          )
        })}
      </VStack>
    </Box>
  )
}
