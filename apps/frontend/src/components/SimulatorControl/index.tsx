import {
  Box,
  Text,
  VStack,
  HStack,
  Heading,
  Separator,
  Button,
} from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { FeedMode, FeedScenario } from '@ledn/shared'
import { useFeedModes } from '../../hooks/usePrices'
import { io } from 'socket.io-client'
import { useStore } from '../../store'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000'
const socket = io(WS_URL, { transports: ['websocket'], autoConnect: false })

const modes = [
  { mode: FeedMode.HEALTHY, label: 'Healthy', colorPalette: 'green' },
  { mode: FeedMode.DELAYED, label: 'Delayed', colorPalette: 'yellow' },
  { mode: FeedMode.DRIFTED, label: 'Drifted', colorPalette: 'orange' },
  { mode: FeedMode.OFFLINE, label: 'Offline', colorPalette: 'red' },
]

const scenarios = [
  {
    scenario: FeedScenario.BTC_GOES_OFFLINE,
    label: 'BTC Offline Path',
    durationMs: 18_000,
  },
  {
    scenario: FeedScenario.ETH_DRIFTS,
    label: 'ETH Drift Path',
    durationMs: 18_000,
  },
  {
    scenario: FeedScenario.DUAL_PRESSURE,
    label: 'Dual Pressure',
    durationMs: 18_000,
  },
]

export function SimulatorControl() {
  const feedModes = useFeedModes()
  const activeSimulation = useStore((s) => s.activeSimulation)
  const setActiveSimulation = useStore((s) => s.setActiveSimulation)
  const clearActiveSimulation = useStore((s) => s.clearActiveSimulation)
  const assets = ['BTC', 'ETH']
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const setMode = (assetId: string, mode: FeedMode) => {
    socket.connect()
    socket.emit('set_feed_mode', { assetId, mode })
  }

  const runScenario = (
    scenario: FeedScenario,
    label: string,
    durationMs: number,
  ) => {
    socket.connect()
    socket.emit('run_feed_scenario', { scenario })
    setActiveSimulation({
      scenario,
      label,
    })

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      clearActiveSimulation()
    }, durationMs + 500)
  }

  return (
    <Box
      p={4}
      borderRadius="md"
      w="100%"
      bg="#ffffff"
      color="#111827"
      borderWidth={1}
      borderColor="#d7dce8"
      _dark={{ bg: '#0a0a0a', color: '#fafafa', borderColor: '#262626' }}
    >
      <Heading size="sm" mb={3} textTransform="uppercase" fontWeight="500" color="#344054" _dark={{ color: '#d4d4d4' }}>
        Feed Simulator
      </Heading>
      <Separator mb={4} borderColor="#d7dce8" _dark={{ borderColor: '#262626' }} />
      <VStack align="stretch" gap={4}>
        <Box>
          <Text
            fontWeight="700"
            mb={2}
            fontSize="xs"
            textTransform="uppercase"
            color="#667085"
            _dark={{ color: '#a3a3a3' }}
          >
            Scenarios
          </Text>
          <VStack gap={2} align="stretch">
            {scenarios.map(({ scenario, label, durationMs }) => {
              const isRunning = activeSimulation?.scenario === scenario

              return (
                <Button
                  key={scenario}
                  px={3}
                  w="100%"
                  size="sm"
                  bg={isRunning ? '#087443' : '#111827'}
                  color="#ffffff"
                  borderWidth={1}
                  borderColor={isRunning ? '#087443' : '#111827'}
                  _hover={{ bg: isRunning ? '#05603a' : '#0b1220' }}
                  _dark={{
                    bg: isRunning ? '#00a86b' : '#171717',
                    color: isRunning ? '#000000' : '#fafafa',
                    borderColor: isRunning ? '#00a86b' : '#404040',
                    _hover: { bg: isRunning ? '#20c987' : '#262626' },
                  }}
                  borderRadius="md"
                  onClick={() => runScenario(scenario, label, durationMs)}
                >
                  {isRunning ? `Running — ${label}` : label}
                </Button>
              )
            })}
          </VStack>
        </Box>

        <Separator borderColor="#d7dce8" _dark={{ borderColor: '#262626' }} />

        {assets.map((assetId) => (
          <Box key={assetId}>
            <Text
              fontWeight="700"
              mb={2}
              fontSize="xs"
              textTransform="uppercase"
              color="#667085"
              _dark={{ color: '#a3a3a3' }}
            >
              {assetId}
            </Text>
            <HStack gap={2} flexWrap="wrap">
              {modes.map(({ mode, label, colorPalette }) => {
                const isActive = feedModes[assetId] === mode

                return (
                  <Button
                    key={mode}
                    px={3}
                    size="sm"
                    colorPalette={colorPalette}
                    variant={isActive ? 'solid' : 'subtle'}
                    borderRadius="md"
                    onClick={() => setMode(assetId, mode)}
                  >
                    {label}
                  </Button>
                )
              })}
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}
