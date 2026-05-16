import { Box, Text, VStack, HStack, Heading, Separator, Button } from '@chakra-ui/react'
import { FeedMode, FeedScenario } from '@ledn/shared'
import { useFeedModes } from '../../hooks/usePrices'
import { io } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000'
const socket = io(WS_URL, { transports: ['websocket'], autoConnect: false })

const modes = [
  { mode: FeedMode.HEALTHY, label: 'Healthy', color: 'green' },
  { mode: FeedMode.DELAYED, label: 'Delayed', color: 'yellow' },
  { mode: FeedMode.DRIFTED, label: 'Drifted', color: 'orange' },
  { mode: FeedMode.OFFLINE, label: 'Offline', color: 'red' },
]

const scenarios = [
  {
    scenario: FeedScenario.BTC_GOES_OFFLINE,
    label: 'BTC Offline Path',
    color: 'red',
  },
  {
    scenario: FeedScenario.ETH_DRIFTS,
    label: 'ETH Drift Path',
    color: 'orange',
  },
  {
    scenario: FeedScenario.DUAL_PRESSURE,
    label: 'Dual Pressure',
    color: 'purple',
  },
]

export function SimulatorControl() {
  const feedModes = useFeedModes()
  const assets = ['BTC', 'ETH']

  const setMode = (assetId: string, mode: FeedMode) => {
    socket.connect()
    socket.emit('set_feed_mode', { assetId, mode })
  }

  const runScenario = (scenario: FeedScenario) => {
    socket.connect()
    socket.emit('run_feed_scenario', { scenario })
  }

  return (
    <Box p={4} borderWidth={1} borderRadius="lg" w="100%">
      <Heading size="sm" mb={3}>Feed Simulator</Heading>
      <Separator mb={3} />
      <VStack align="stretch" gap={4}>
        <Box>
          <Text fontWeight="bold" mb={2}>Scenarios</Text>
          <HStack gap={4} flexWrap="wrap">
            {scenarios.map(({ scenario, label, color }) => (
              <Button
                key={scenario}
                px={2}
                size="sm"
                colorPalette={color}
                variant="subtle"
                onClick={() => runScenario(scenario)}
              >
                {label}
              </Button>
            ))}
          </HStack>
        </Box>

        <Separator />

        {assets.map((assetId) => (
          <Box key={assetId}>
            <Text fontWeight="bold" mb={2}>{assetId}</Text>
            <HStack gap={4} flexWrap="wrap">
              {modes.map(({ mode, label, color }) => (
                <Button
                  key={mode}
                  px={2}
                  size="sm"
                  colorPalette={color}
                  variant={feedModes[assetId] === mode ? 'solid' : 'outline'}
                  onClick={() => setMode(assetId, mode)}

                >
                  {label}
                </Button>
              ))}
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}
