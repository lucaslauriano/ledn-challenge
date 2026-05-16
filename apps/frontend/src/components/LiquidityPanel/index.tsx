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
      <Box
        p={4}
        borderWidth={1}
        borderColor="#d7dce8"
        _dark={{ borderColor: '#262626', bg: '#0a0a0a' }}
        borderRadius="md"
        bg="#ffffff"
        w="100%"
      >
        <Heading size="sm" mb={3}>
          Liquidity
        </Heading>
        <Text color="gray.400" fontSize="sm">
          Waiting for data...
        </Text>
      </Box>
    )
  }

  const availablePercent = Math.round(
    (liquidity.available / liquidity.total) * 100,
  )
  const availableAdjusted = liquidity.availableAdjusted ?? liquidity.available
  const degradedAssets = liquidity.degradedAssets ?? []

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
          Liquidity Aggregation
        </Heading>
        <Text fontSize="xs" color="gray.400">
          Updated {new Date(liquidity.updatedAt).toLocaleTimeString()}
        </Text>
      </HStack>
      <Separator
        mb={4}
        borderColor="#d7dce8"
        _dark={{ borderColor: '#262626' }}
      />
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
                {degradedAssets.length > 0
                  ? degradedAssets.join(', ')
                  : 'DEGRADED'}
              </Badge>
            </HStack>
          </Box>
        )}

        <HStack justify="space-between">
          <Text fontSize="sm" color="gray.500">
            {liquidity.conservativeMode
              ? 'Raw available capital'
              : 'Available capital'}
          </Text>
          <VStack align="end" gap={0}>
            <Text
              fontSize="2xl"
              fontWeight="800"
              color="#087443"
              fontFamily="mono"
            >
              {formatCurrency(liquidity.available)}
            </Text>
            <Text fontSize="xs" color="#667085" _dark={{ color: '#a3a3a3' }}>
              {availablePercent}% utilization
            </Text>
          </VStack>
        </HStack>

        {liquidity.conservativeMode && (
          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <Text fontSize="sm" color="gray.500">
                Conservative available
              </Text>
              <Text fontSize="xs" color="gray.400">
                Used for lock validation
              </Text>
            </VStack>
            <Text fontWeight="bold" color="orange.500">
              {formatCurrency(availableAdjusted)}
            </Text>
          </HStack>
        )}

        <HStack gap={4} align="stretch">
          <Box
            flex={1}
            p={3}
            bg="#ffe4b8"
            _dark={{ bg: '#171717', borderColor: '#404040' }}
            borderRadius="md"
            borderWidth={1}
            borderColor="#f6c36d"
          >
            <Text
              fontSize="xs"
              color="#7a4b00"
              _dark={{ color: '#f5c879' }}
              textTransform="uppercase"
            >
              Locked assets
            </Text>
            <Text fontWeight="800" fontFamily="mono">
              {formatCurrency(liquidity.locked)}
            </Text>
          </Box>
          <Box
            flex={1}
            p={3}
            bg="#e7f0ff"
            _dark={{ bg: '#171717', borderColor: '#404040' }}
            borderRadius="md"
            borderWidth={1}
            borderColor="#c5d7f5"
          >
            <Text
              fontSize="xs"
              color="#31527a"
              _dark={{ color: '#9bc2f5' }}
              textTransform="uppercase"
            >
              In flight
            </Text>
            <Text fontWeight="800" fontFamily="mono">
              {formatCurrency(liquidity.inFlight)}
            </Text>
          </Box>
        </HStack>

        <Separator borderColor="#111827" _dark={{ borderColor: '#e5edf7' }} />

        <HStack justify="space-between">
          <Text fontSize="sm" color="gray.500">
            Confidence
          </Text>
          <Badge
            colorPalette={liquidity.confidence === 'FRESH' ? 'green' : 'yellow'}
            px={2}
            py={1}
            borderRadius="md"
          >
            {liquidity.confidence}
          </Badge>
        </HStack>

        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="800" textTransform="uppercase">
            Total operational vault
          </Text>
          <Text fontWeight="800" fontSize="xl" fontFamily="mono">
            {formatCurrency(liquidity.total)}
          </Text>
        </HStack>

        <Separator />

        <VStack align="stretch" gap={2} mt={2}>
          <Heading size="xs" textTransform="uppercase" fontWeight="500">
            Asset lock/release protocol
          </Heading>
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
              px={2}
              bg="#f5f7fb"
              borderColor="#d7dce8"
              _dark={{ bg: '#111111', borderColor: '#404040' }}
            />
            <Button
              size="sm"
              px={4}
              bg="#111827"
              color="#ffffff"
              _dark={{
                bg: '#fafafa',
                color: '#000000',
                _hover: { bg: '#d4d4d4' },
              }}
              _hover={{ bg: '#0b1220' }}
              loading={isSubmitting}
              onClick={() => void submitLiquidityAction('lock')}
            >
              Initiate lock
            </Button>
            <Button
              size="sm"
              px={4}
              variant="outline"
              borderColor="#111827"
              color="#111827"
              _dark={{
                borderColor: '#fafafa',
                color: '#fafafa',
                _hover: { bg: '#171717' },
              }}
              loading={isSubmitting}
              onClick={() => void submitLiquidityAction('release')}
            >
              Release
            </Button>
          </HStack>
          {message && (
            <Text
              fontSize="xs"
              color={message.tone === 'error' ? 'red.500' : 'green.500'}
            >
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
                    <Badge
                      colorPalette={entry.type === 'LOCK' ? 'orange' : 'green'}
                      px={2}
                      py={1}
                    >
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
