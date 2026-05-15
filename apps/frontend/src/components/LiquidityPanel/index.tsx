import { Box, Text, VStack, HStack, Heading, Separator, Badge } from '@chakra-ui/react'
import { useLiquidity } from '../../hooks/useLiquidity'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

export function LiquidityPanel() {
  const liquidity = useLiquidity()

  if (!liquidity) {
    return (
      <Box p={4} borderWidth={1} borderRadius="lg" w="100%">
        <Heading size="sm" mb={3}>Liquidity</Heading>
        <Text color="gray.400" fontSize="sm">Waiting for data...</Text>
      </Box>
    )
  }

  const availablePercent = Math.round((liquidity.available / liquidity.total) * 100)

  return (
    <Box p={4} borderWidth={1} borderRadius="lg" w="100%">
      <HStack justify="space-between" mb={3}>
        <Heading size="sm">Liquidity</Heading>
        <Text fontSize="xs" color="gray.400">
          Updated {new Date(liquidity.updatedAt).toLocaleTimeString()}
        </Text>
      </HStack>
      <Separator mb={3} />
      <VStack align="stretch" gap={3}>
        <HStack justify="space-between">
          <Text fontSize="sm" color="gray.500">Available</Text>
          <HStack>
            <Badge colorPalette="green">{availablePercent}%</Badge>
            <Text fontWeight="bold" color="green.500">
              {formatCurrency(liquidity.available)}
            </Text>
          </HStack>
        </HStack>

        <HStack justify="space-between">
          <Text fontSize="sm" color="gray.500">Locked</Text>
          <Text fontWeight="medium" color="orange.500">
            {formatCurrency(liquidity.locked)}
          </Text>
        </HStack>

        <HStack justify="space-between">
          <Text fontSize="sm" color="gray.500">In flight</Text>
          <Text fontWeight="medium" color="blue.500">
            {formatCurrency(liquidity.inFlight)}
          </Text>
        </HStack>

        <Separator />

        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="bold">Total</Text>
          <Text fontWeight="bold">
            {formatCurrency(liquidity.total)}
          </Text>
        </HStack>
      </VStack>
    </Box>
  )
}