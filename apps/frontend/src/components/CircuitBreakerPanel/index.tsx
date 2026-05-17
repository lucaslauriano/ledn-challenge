import { Box, Badge, Text, VStack, HStack, Heading, Separator } from '@chakra-ui/react'
import { CircuitState } from '@ledn/shared'
import { useCircuitStates } from '../../hooks/usePrices'
import { getCircuitStateLabel } from '../../utils/status-labels'

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
    <Box
      p={4}
      borderWidth={1}
      borderColor="#d7dce8"
      _dark={{ borderColor: '#262626', bg: '#0a0a0a' }}
      borderRadius="md"
      bg="#ffffff"
      w="100%"
    >
      <Heading size="sm" mb={3} textTransform="uppercase" fontWeight="500" color="#344054" _dark={{ color: '#d4d4d4' }}>
        Circuit Breakers
      </Heading>
      <Separator mb={3} borderColor="#d7dce8" _dark={{ borderColor: '#262626' }} />
      <VStack align="stretch" gap={3}>
        {assets.map((assetId) => {
          const state = circuitStates[assetId] ?? CircuitState.CLOSED

          return (
            <HStack
              key={assetId}
              justify="space-between"
              p={3}
              borderWidth={1}
              borderColor="#d7dce8"
              _dark={{ borderColor: '#262626', bg: '#111111' }}
              borderRadius="md"
            >
              <Box>
                <Text fontWeight="800" letterSpacing="-0.03em">{assetId}-USD-X</Text>
                <Text fontSize="xs" color="#667085" _dark={{ color: '#a3a3a3' }}>
                  {stateDescription(state)}
                </Text>
              </Box>
              <Badge colorPalette={stateColor(state)} px={3} py={2} borderRadius="md" fontSize="sm">
                {getCircuitStateLabel(state)}
              </Badge>
            </HStack>
          )
        })}
      </VStack>
    </Box>
  )
}