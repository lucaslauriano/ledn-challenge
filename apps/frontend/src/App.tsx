import {
  createSystem,
  defaultConfig,
  ChakraProvider,
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
import { ColorModeProvider } from './components/ui/color-mode'

const system = createSystem(defaultConfig)

function Dashboard() {
  useWebSocket()
  const connected = useStore((s) => s.connected)

  return (
    <Box minH="100vh" bg="bg" p={6}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Ledn Operations Dashboard</Heading>
        <HStack>
          <ThemeToggle />
          <Badge colorPalette={connected ? 'green' : 'red'}>
            {connected ? 'Live' : 'Disconnected'}
          </Badge>
          <Text fontSize="sm" color="fg.muted">
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
    <ChakraProvider value={system}>
      <ColorModeProvider>
        <Dashboard />
      </ColorModeProvider>
    </ChakraProvider>
  )
}
