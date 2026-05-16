import { useEffect, useState } from 'react'
import {
  Box,
  Text,
  VStack,
  HStack,
  Heading,
  Separator,
  Badge,
  Button,
  Input,
} from '@chakra-ui/react'
import type { LiquiditySnapshot } from '@ledn/shared'
import { useLiquidity } from '../../hooks/useLiquidity'
import { useStore } from '../../store'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type AuditEntry = {
  id: string
  type: 'LOCK' | 'RELEASE'
  amount: number
  operatorId: string
  timestamp: number
}

type ActionMessage = {
  tone: 'success' | 'error'
  text: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

export function LiquidityPanel() {
  const liquidity = useLiquidity()
  const setLiquidity = useStore((s) => s.setLiquidity)
  const [amount, setAmount] = useState('')
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([])
  const [message, setMessage] = useState<ActionMessage | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadAuditTrail = async () => {
    try {
      const response = await fetch(`${API_URL}/liquidity/audit`)
      if (!response.ok) return
      setAuditTrail(await response.json())
    } catch {
      setAuditTrail([])
    }
  }

  useEffect(() => {
    void fetch(`${API_URL}/liquidity/audit`)
      .then((response) => (response.ok ? response.json() : []))
      .then((entries: AuditEntry[]) => setAuditTrail(entries))
      .catch(() => setAuditTrail([]))
  }, [])

  const submitLiquidityAction = async (action: 'lock' | 'release') => {
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage({ tone: 'error', text: 'Enter a positive amount.' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch(`${API_URL}/liquidity/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsedAmount }),
      })
      const data = await response.json()

      if (!response.ok) {
        setMessage({ tone: 'error', text: data.message ?? `${action} failed.` })
        return
      }

      setLiquidity(data as LiquiditySnapshot)
      await loadAuditTrail()
      setAmount('')
      setMessage({
        tone: 'success',
        text: `${action === 'lock' ? 'Locked' : 'Released'} ${formatCurrency(parsedAmount)}.`,
      })
    } catch {
      setMessage({
        tone: 'error',
        text: 'Liquidity action failed. Check the backend connection.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!liquidity) {
    return (
      <Box p={4} borderWidth={1} borderRadius="lg" w="100%">
        <Heading size="sm" mb={3}>Liquidity</Heading>
        <Text color="gray.400" fontSize="sm">Waiting for data...</Text>
      </Box>
    )
  }

  const availablePercent = Math.round((liquidity.available / liquidity.total) * 100)
  const availableAdjusted = liquidity.availableAdjusted ?? liquidity.available
  const degradedAssets = liquidity.degradedAssets ?? []

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
        {liquidity.conservativeMode && (
          <Box p={3} borderWidth={1} borderRadius="md" borderColor="orange.300">
            <HStack justify="space-between" align="start">
              <VStack align="start" gap={1}>
                <Text fontSize="sm" fontWeight="bold" color="orange.500">
                  Pricing degraded — conservative liquidity mode
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Lock decisions use conservative available liquidity.
                </Text>
              </VStack>
              <Badge colorPalette="orange">
                {degradedAssets.length > 0 ? degradedAssets.join(', ') : 'DEGRADED'}
              </Badge>
            </HStack>
          </Box>
        )}

        <HStack justify="space-between">
          <Text fontSize="sm" color="gray.500">
            {liquidity.conservativeMode ? 'Raw available' : 'Available'}
          </Text>
          <HStack>
            <Badge colorPalette="green">{availablePercent}%</Badge>
            <Text fontWeight="bold" color="green.500">
              {formatCurrency(liquidity.available)}
            </Text>
          </HStack>
        </HStack>

        {liquidity.conservativeMode && (
          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <Text fontSize="sm" color="gray.500">Conservative available</Text>
              <Text fontSize="xs" color="gray.400">Used for lock validation</Text>
            </VStack>
            <Text fontWeight="bold" color="orange.500">
              {formatCurrency(availableAdjusted)}
            </Text>
          </HStack>
        )}

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
          <Text fontSize="sm" color="gray.500">Confidence</Text>
          <Badge colorPalette={liquidity.confidence === 'FRESH' ? 'green' : 'yellow'}>
            {liquidity.confidence}
          </Badge>
        </HStack>

        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="bold">Total</Text>
          <Text fontWeight="bold">
            {formatCurrency(liquidity.total)}
          </Text>
        </HStack>

        <Separator />

        <VStack align="stretch" gap={2}>
          <Heading size="xs">Operator action</Heading>
          {liquidity.conservativeMode && (
            <Text fontSize="xs" color="orange.500">
              Max lock amount uses conservative available.
            </Text>
          )}
          <HStack>
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount"
              type="number"
              min={0}
              size="sm"
            />
            <Button
              size="sm"
              colorPalette="green"
              loading={isSubmitting}
              onClick={() => void submitLiquidityAction('lock')}
            >
              Lock
            </Button>
            <Button
              size="sm"
              colorPalette="orange"
              loading={isSubmitting}
              onClick={() => void submitLiquidityAction('release')}
            >
              Release
            </Button>
          </HStack>
          {message && (
            <Text fontSize="xs" color={message.tone === 'error' ? 'red.500' : 'green.500'}>
              {message.text}
            </Text>
          )}
        </VStack>

        {auditTrail.length > 0 && (
          <>
            <Separator />
            <VStack align="stretch" gap={2}>
              <Heading size="xs">Recent audit</Heading>
              {auditTrail.slice(0, 5).map((entry) => (
                <HStack key={entry.id} justify="space-between">
                  <HStack>
                    <Badge colorPalette={entry.type === 'LOCK' ? 'orange' : 'green'}>
                      {entry.type}
                    </Badge>
                    <Text fontSize="sm">{formatCurrency(entry.amount)}</Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.400">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </>
        )}
      </VStack>
    </Box>
  )
}
