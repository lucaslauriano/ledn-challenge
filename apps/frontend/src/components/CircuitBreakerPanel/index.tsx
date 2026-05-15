import { Box, Badge, Text, VStack, HStack, Heading, Separator } from '@chakra-ui/react'
import { CircuitState } from '@ledn/shared'
import { useCircuitStates } from '../../hooks/usePrices'

const stateColor = (state: CircuitState) => {
  switch (state) {
    case CircuitState.CLOSED: return 'green'
    case CircuitState.HALF_OPEN: return 'yellow'
    case CircuitState.OPEN: return 'red'
  }
}

const stateDescription = (state: CircuitState) => {
  switch (state) {
    case CircuitState.CLOSED: return 'Operating normally'
    case CircuitState.HALF_OPEN: return 'Testing recovery'
    case CircuitState.OPEN: return 'Using cached data'
  }
}

export function CircuitBreakerPanel() {
  const circuitStates = useCircuitStates()
  const assets = ['BTC', 'ETH']

  return (
    <Box p={4} borderWidth={1} borderRadius="lg" w="100%">
      <Heading size="sm" mb={3}>Circuit Breaker</Heading>
      <Separator mb={3} />
      <VStack align="stretch" gap={3}>
        {assets.map((assetId) => {
          const state = circuitStates[assetId] ?? CircuitState.CLOSED

          return (
            <HStack key={assetId} justify="space-between">
              <Text fontWeight="bold">{assetId}</Text>
              <HStack>
                <Text fontSize="sm" color="gray.500">
                  {stateDescription(state)}
                </Text>
                <Badge colorPalette={stateColor(state)}>
                  {state}
                </Badge>
              </HStack>
            </HStack>
          )
        })}
      </VStack>
    </Box>
  )
}