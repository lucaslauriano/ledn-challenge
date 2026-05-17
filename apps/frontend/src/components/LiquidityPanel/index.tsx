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
import { FRONTEND_ENV } from '../../config/env'
import {
  getAuditEntryLabel,
  getLiquidityConfidenceLabel,
} from '../../utils/status-labels'

type AuditEntry = {
  id: string
  type:
    | 'LOCK'
    | 'RELEASE'
    | 'SETTLEMENT_START'
    | 'SETTLEMENT_SETTLE'
    | 'SETTLEMENT_FAIL'
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

const auditEntryColor = (type: AuditEntry['type']) => {
  if (type === 'LOCK' || type === 'SETTLEMENT_START') return 'orange'
  if (type === 'SETTLEMENT_FAIL') return 'red'
  return 'green'
}

export function LiquidityPanel() {
  const liquidity = useLiquidity()
  const setLiquidity = useStore((s) => s.setLiquidity)
  const [amount, setAmount] = useState('')
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([])
  const [message, setMessage] = useState<ActionMessage | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadAuditTrail = async () => {
    try {
      const response = await fetch(`${FRONTEND_ENV.apiUrl}/liquidity/audit`)
      if (!response.ok) return
      setAuditTrail(await response.json())
    } catch {
      setAuditTrail([])
    }
  }

  useEffect(() => {
    void fetch(`${FRONTEND_ENV.apiUrl}/liquidity/audit`)
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
      const response = await fetch(
        `${FRONTEND_ENV.apiUrl}/liquidity/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: parsedAmount }),
        },
      )
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
        text:
          action === 'lock'
            ? `Locked ${formatCurrency(parsedAmount)}: available decreased, locked increased.`
            : `Released ${formatCurrency(parsedAmount)}: locked decreased, available increased.`,
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
  const maxLockableAmount = liquidity.conservativeMode
    ? availableAdjusted
    : liquidity.available
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
        <Box
          p={3}
          borderWidth={1}
          borderColor="#d7dce8"
          _dark={{ borderColor: '#262626', bg: '#111111' }}
          borderRadius="md"
          bg="#f8fafc"
        >
          <Text fontSize="sm" color="#344054" _dark={{ color: '#d4d4d4' }}>
            Lock moves funds from available to locked. Release moves locked funds
            back to available.
          </Text>
        </Box>

        {liquidity.conservativeMode && (
          <Box p={3} borderWidth={1} borderRadius="md" borderColor="orange.300">
            <HStack justify="space-between" align="start">
              <VStack align="start" gap={1}>
                <Text fontSize="sm" fontWeight="bold" color="orange.500">
                  Pricing degraded — conservative liquidity mode
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Lock validation uses the adjusted max lockable amount below.
                </Text>
              </VStack>
              <Badge colorPalette="orange">
                {degradedAssets.length > 0
                  ? degradedAssets.join(', ')
                  : 'Degraded'}
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
              {availablePercent}% of vault is immediately available
            </Text>
          </VStack>
        </HStack>

        <HStack justify="space-between">
          <VStack align="start" gap={0}>
            <Text fontSize="sm" color="gray.500">
              Max lockable amount
            </Text>
            <Text fontSize="xs" color="gray.400">
              {liquidity.conservativeMode
                ? 'Uses conservative available while pricing is degraded'
                : 'Matches current available capital'}
            </Text>
          </VStack>
          <Text
            fontWeight="bold"
            color={liquidity.conservativeMode ? 'orange.500' : '#087443'}
          >
            {formatCurrency(maxLockableAmount)}
          </Text>
        </HStack>

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
              In-flight settlement
            </Text>
            <Text fontWeight="800" fontFamily="mono">
              {formatCurrency(liquidity.inFlight)}
            </Text>
            <Text fontSize="xs" color="#667085" _dark={{ color: '#a3a3a3' }}>
              Settlement rail simulation, not changed by lock/release
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
            {getLiquidityConfidenceLabel(liquidity.confidence)}
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
          <Text fontSize="xs" color="#667085" _dark={{ color: '#a3a3a3' }}>
            Lock decreases available capital and increases locked assets. Release
            decreases locked assets and returns funds to available capital.
          </Text>
          <Text
            fontSize="xs"
            color={liquidity.conservativeMode ? 'orange.500' : 'gray.500'}
          >
            Current max lockable amount: {formatCurrency(maxLockableAmount)}
          </Text>
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
                      colorPalette={auditEntryColor(entry.type)}
                      px={2}
                      py={1}
                    >
                      {getAuditEntryLabel(entry.type)}
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
