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
  VStack,
  Separator,
} from '@chakra-ui/react'
import { useWebSocket } from './hooks/useWebSocket'
import { useStore } from './store'
import { FeedHealthPanel } from './components/FeedHealthPanel'
import { CircuitBreakerPanel } from './components/CircuitBreakerPanel'
import { LiquidityPanel } from './components/LiquidityPanel'
import { SettlementPanel } from './components/SettlementPanel'
import { AlertFeed } from './components/AlertFeed'
import { SimulatorControl } from './components/SimulatorControl'
import { ThemeToggle } from './components/ThemeToggle'
import { ColorModeProvider } from './components/ui/color-mode'
import { useColorMode } from './components/ui/use-color-mode'

const system = createSystem(defaultConfig)

const navItems = ['Dashboard']

function Dashboard() {
  useWebSocket()
  const connected = useStore((s) => s.connected)
  const activeSimulation = useStore((s) => s.activeSimulation)
  const { colorMode } = useColorMode()
  const isDark = colorMode === 'dark'

  return (
    <Box
      minH="100vh"
      bg={isDark ? '#000000' : '#f4f6fb'}
      color={isDark ? '#fafafa' : '#111827'}
      fontFamily="Inter, system-ui, sans-serif"
    >
      <HStack
        h="48px"
        px={5}
        justify="space-between"
        borderBottom="1px solid"
        borderColor={isDark ? '#262626' : '#d7dce8'}
        bg={isDark ? '#0a0a0a' : '#fbfcff'}
      >
        <Heading size="md" letterSpacing="-0.04em" textTransform="uppercase">
          Ledn Operations Dashboard
        </Heading>
        <HStack gap={4}>
          <Badge
            px={3}
            py={1}
            borderRadius="md"
            colorPalette={connected ? 'green' : 'red'}
            variant="subtle"
          >
            {connected ? 'LIVE' : 'DISCONNECTED'}
          </Badge>
          <Text fontSize="sm" fontFamily="mono">
            {new Date().toLocaleTimeString()}
          </Text>
          <ThemeToggle />
        </HStack>
      </HStack>

      {activeSimulation && (
        <HStack
          px={5}
          py={2}
          justify="space-between"
          bg={isDark ? '#052e1a' : '#ecfdf3'}
          color={isDark ? '#7ee2a8' : '#05603a'}
          borderBottom="1px solid"
          borderColor={isDark ? '#14532d' : '#abefc6'}
        >
          <Text fontSize="sm" fontWeight="700">
            Simulation running: {activeSimulation.label}
          </Text>
          <Text fontSize="xs" fontFamily="mono">
            Auto-clears when the scenario completes
          </Text>
        </HStack>
      )}

      <Grid
        templateColumns={{ base: '1fr', xl: '320px 1fr' }}
        minH={activeSimulation ? 'calc(100vh - 85px)' : 'calc(100vh - 48px)'}
      >
        <GridItem
          display={{ base: 'none', xl: 'block' }}
          borderRight="1px solid"
          borderColor={isDark ? '#262626' : '#cfd5e3'}
          bg={isDark ? '#0a0a0a' : '#f8fafc'}
        >
          <Box
            p={5}
            borderBottom="1px solid"
            borderColor={isDark ? '#262626' : '#d7dce8'}
          >
            <Text fontSize="sm" fontWeight="700" textTransform="uppercase">
              Operations
            </Text>
            <Text
              fontSize="xs"
              color={isDark ? '#a3a3a3' : '#667085'}
              fontFamily="mono"
            >
              v2.4.0-prod
            </Text>
          </Box>
          <VStack align="stretch" gap={1} p={3}>
            {navItems.map((item) => (
              <Box
                key={item}
                px={4}
                py={3}
                borderRadius="sm"
                bg={
                  item === 'Dashboard'
                    ? isDark
                      ? '#171717'
                      : '#dfeafe'
                    : 'transparent'
                }
                borderLeft={
                  item === 'Dashboard'
                    ? `3px solid ${isDark ? '#ffffff' : '#111827'}`
                    : '3px solid transparent'
                }
                color={
                  item === 'Dashboard'
                    ? isDark
                      ? '#ffffff'
                      : '#111827'
                    : isDark
                      ? '#a3a3a3'
                      : '#475467'
                }
                fontWeight={item === 'Dashboard' ? '700' : '500'}
                fontSize="sm"
              >
                {item}
              </Box>
            ))}
          </VStack>
          <Box px={3} py={2}>
            <Separator mb={4} borderColor={isDark ? '#262626' : '#d7dce8'} />
            <Text
              px={1}
              mb={3}
              fontSize="xs"
              fontWeight="700"
              color={isDark ? '#a3a3a3' : '#667085'}
              letterSpacing="0.12em"
              textTransform="uppercase"
            >
              Simulation Console
            </Text>
            <SimulatorControl />
          </Box>
        </GridItem>

        <GridItem p={{ base: 4, lg: 6 }} overflow="hidden">
          <Grid
            templateColumns={{ base: '1fr', lg: '1.45fr 0.85fr' }}
            gap={5}
            alignItems="start"
            maxW="1180px"
            mx="auto"
          >
            <GridItem>
              <VStack align="stretch" gap={5}>
                <FeedHealthPanel />
                <LiquidityPanel />
                <SettlementPanel />
                <Box display={{ base: 'block', xl: 'none' }}>
                  <SimulatorControl />
                </Box>
              </VStack>
            </GridItem>
            <GridItem>
              <VStack align="stretch" gap={5}>
                <CircuitBreakerPanel />
                <AlertFeed />
              </VStack>
            </GridItem>
          </Grid>
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
