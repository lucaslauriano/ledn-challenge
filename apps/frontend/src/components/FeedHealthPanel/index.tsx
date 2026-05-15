import { Box, Badge, Text, VStack, HStack, Heading, Separator } from '@chakra-ui/react'
import { DataConfidence, FeedMode } from '@ledn/shared'
import { usePrices, useFeedModes } from '../../hooks/usePrices'

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

export function FeedHealthPanel() {
  const prices = usePrices()
  const feedModes = useFeedModes()
  const assets = ['BTC', 'ETH']

  return (
    <Box p={4} borderWidth={1} borderRadius="lg" w="100%">
      <Heading size="sm" mb={3}>Feed Health</Heading>
      <Separator mb={3} />
      <VStack align="stretch" gap={3}>
        {assets.map((assetId) => {
          const price = prices[assetId]
          const mode = feedModes[assetId] ?? FeedMode.HEALTHY

          return (
            <HStack key={assetId} justify="space-between">
              <HStack>
                <Text fontWeight="bold">{assetId}</Text>
                <Badge colorPalette={modeColor(mode)}>{mode}</Badge>
              </HStack>
              <HStack>
                <Text fontSize="sm" color="gray.500">
                  {price ? `$${price.price.toLocaleString()}` : '—'}
                </Text>
                {price && (
                  <Badge colorPalette={confidenceColor(price.confidence)}>
                    {price.confidence}
                  </Badge>
                )}
                {price && (
                  <Text fontSize="xs" color="gray.400">
                    {price.ageMs}ms
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