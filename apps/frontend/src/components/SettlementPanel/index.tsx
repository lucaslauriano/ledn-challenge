import { useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Input,
  Separator,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  SettlementScenario,
  SettlementStatus,
  type SettlementOperation,
  type SettlementSnapshot,
} from '@ledn/shared'
import { FRONTEND_ENV } from '../../config/env'
import { useStore } from '../../store'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const formatAge = (ageMs: number) => `${Math.round(ageMs / 1000)}s`

const statusPalette: Record<SettlementStatus, string> = {
  [SettlementStatus.CREATED]: 'gray',
  [SettlementStatus.BOOKED]: 'blue',
  [SettlementStatus.LOCKED]: 'purple',
  [SettlementStatus.SUBMITTED]: 'cyan',
  [SettlementStatus.PENDING_SETTLEMENT]: 'orange',
  [SettlementStatus.SETTLED]: 'green',
  [SettlementStatus.FAILED]: 'red',
}

export function SettlementPanel() {
  const settlements = useStore((s) => s.settlements)
  const setSettlements = useStore((s) => s.setSettlements)
  const [amount, setAmount] = useState('25000')
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (
    path: string,
    options?: { method?: string; body?: unknown },
  ) => {
    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch(`${FRONTEND_ENV.apiUrl}${path}`, {
        method: options?.method ?? 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      })
      const data = (await response.json()) as SettlementSnapshot

      if (!response.ok) {
        setMessage('Settlement action failed.')
        return
      }

      setSettlements(data)
      setMessage('Settlement state updated.')
    } catch {
      setMessage('Settlement action failed. Check backend connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const startSettlement = (scenario: SettlementScenario) => {
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage('Enter a positive settlement amount.')
      return
    }

    void submit('/settlements/start', {
      body: { amount: parsedAmount, scenario },
    })
  }

  const latestPending = settlements?.operations.find(
    (operation) => operation.status === SettlementStatus.PENDING_SETTLEMENT,
  )

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
      <HStack justify="space-between" mb={3}>
        <Heading
          size="sm"
          textTransform="uppercase"
          fontWeight="500"
          color="#344054"
          _dark={{ color: '#d4d4d4' }}
        >
          Settlement Timing
        </Heading>
        <Badge colorPalette="orange" px={2} py={1} borderRadius="md">
          Exposure Window
        </Badge>
      </HStack>
      <Separator
        mb={4}
        borderColor="#d7dce8"
        _dark={{ borderColor: '#262626' }}
      />

      <VStack align="stretch" gap={3}>
        <Text fontSize="sm" color="#667085" _dark={{ color: '#a3a3a3' }}>
          Booked or locked funds are not settled yet. In-flight settlement keeps
          a temporary exposure window visible to operators.
        </Text>

        <HStack gap={3} align="stretch">
          <Metric
            label="Pending settlement"
            value={formatCurrency(settlements?.pendingSettlementAmount ?? 0)}
          />
          <Metric
            label="Delayed amount"
            value={formatCurrency(settlements?.delayedSettlementAmount ?? 0)}
          />
          <Metric
            label="Oldest pending age"
            value={formatAge(settlements?.oldestPendingSettlementAgeMs ?? 0)}
          />
        </HStack>

        <HStack>
          <Input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            min={0}
            size="sm"
            px={2}
            bg="#f5f7fb"
            borderColor="#d7dce8"
            _dark={{ bg: '#111111', borderColor: '#404040' }}
          />
          <Button
            size="sm"
            px={4}
            loading={isSubmitting}
            bg="#111827"
            color="#ffffff"
            _hover={{ bg: '#0b1220' }}
            _dark={{
              bg: '#fafafa',
              color: '#000000',
              _hover: { bg: '#d4d4d4' },
            }}
            onClick={() => startSettlement(SettlementScenario.NORMAL)}
          >
            Start
          </Button>
          <Button
            size="sm"
            px={4}
            loading={isSubmitting}
            colorPalette="orange"
            onClick={() => startSettlement(SettlementScenario.DELAYED)}
          >
            Delayed
          </Button>
        </HStack>

        {latestPending && (
          <HStack>
            <Button
              size="sm"
              px={4}
              loading={isSubmitting}
              variant="outline"
              onClick={() =>
                void submit(`/settlements/${latestPending.id}/delay`, {
                  method: 'PATCH',
                })
              }
            >
              Force delay
            </Button>
            <Button
              size="sm"
              px={4}
              loading={isSubmitting}
              colorPalette="green"
              onClick={() =>
                void submit(`/settlements/${latestPending.id}/settle`, {
                  method: 'PATCH',
                })
              }
            >
              Settle latest
            </Button>
            <Button
              size="sm"
              px={4}
              loading={isSubmitting}
              colorPalette="red"
              onClick={() =>
                void submit(`/settlements/${latestPending.id}/fail`, {
                  method: 'PATCH',
                })
              }
            >
              Fail latest
            </Button>
          </HStack>
        )}

        {message && (
          <Text fontSize="xs" color="#667085" _dark={{ color: '#a3a3a3' }}>
            {message}
          </Text>
        )}

        <VStack align="stretch" gap={2}>
          <Heading size="xs">Recent settlement operations</Heading>
          {(settlements?.operations ?? []).slice(0, 5).map((operation) => (
            <SettlementRow key={operation.id} operation={operation} />
          ))}
          {(settlements?.operations ?? []).length === 0 && (
            <Text fontSize="xs" color="gray.400">
              No settlement operations yet.
            </Text>
          )}
        </VStack>
      </VStack>
    </Box>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box
      flex={1}
      p={3}
      borderWidth={1}
      borderColor="#d7dce8"
      _dark={{ borderColor: '#404040', bg: '#171717' }}
      borderRadius="md"
      bg="#f8fafc"
    >
      <Text fontSize="xs" color="#667085" textTransform="uppercase">
        {label}
      </Text>
      <Text fontWeight="800" fontFamily="mono">
        {value}
      </Text>
    </Box>
  )
}

function SettlementRow({ operation }: { operation: SettlementOperation }) {
  return (
    <HStack justify="space-between">
      <VStack align="start" gap={0}>
        <HStack>
          <Badge
            colorPalette={statusPalette[operation.status]}
            px={2}
            py={1}
          >
            {operation.status}
          </Badge>
          <Text fontSize="sm">{formatCurrency(operation.amount)}</Text>
        </HStack>
        <Text fontSize="xs" color="gray.400">
          {operation.id} - exposure {formatAge(operation.exposureWindowMs)}
        </Text>
      </VStack>
      <Text fontSize="xs" color="gray.400">
        {operation.scenario}
      </Text>
    </HStack>
  )
}
