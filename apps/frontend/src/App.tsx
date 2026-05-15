import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import {
  Box,
  Grid,
  GridItem,
  HStack,
  Heading,
  Badge,
  Text,
} from '@chakra-ui/react'
import { useWebSocket } from './hooks/useWebSocket'
import { useStore } from './store'
import { FeedHealthPanel } from './components/FeedHealthPanel'
import { CircuitBreakerPanel } from './components/CircuitBreakerPanel'
import { LiquidityPanel } from './components/LiquidityPanel'
import { AlertFeed } from './components/AlertFeed'
import { SimulatorControl } from './components/SimulatorControl'
import { ThemeToggle } from './components/ThemeToggle'

function Dashboard() {
  useWebSocket()
  const connected = useStore((s) => s.connected)

  return (
    <Box minH="100vh" bg="gray.50" p={6}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Ledn Operations Dashboard</Heading>
        <HStack>
          <ThemeToggle />
          <Badge colorPalette={connected ? 'green' : 'red'}>
            {connected ? 'Live' : 'Disconnected'}
          </Badge>
          <Text fontSize="sm" color="gray.500">
            {new Date().toLocaleTimeString()}
          </Text>
        </HStack>
      </HStack>

      <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={4}>
        <GridItem>
          <FeedHealthPanel />
        </GridItem>

        <GridItem>
          <CircuitBreakerPanel />
        </GridItem>

        <GridItem>
          <LiquidityPanel />
        </GridItem>

        <GridItem>
          <AlertFeed />
        </GridItem>

        <GridItem colSpan={{ base: 1, lg: 2 }}>
          <SimulatorControl />
        </GridItem>
      </Grid>
    </Box>
  )
}

export default function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <Dashboard />
    </ChakraProvider>
  )
}
