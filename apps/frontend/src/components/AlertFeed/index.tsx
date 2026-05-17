import {
  Box,
  Text,
  VStack,
  HStack,
  Heading,
  Separator,
  Badge,
} from '@chakra-ui/react'
import { AlertSeverity } from '@ledn/shared'
import { useActiveAlerts } from '../../hooks/useAlerts'
import {
  getAlertSeverityLabel,
  getAlertTypeLabel,
} from '../../utils/status-labels'

const severityColor = (severity: AlertSeverity) => {
  switch (severity) {
    case AlertSeverity.MEDIUM:
      return 'yellow'
    case AlertSeverity.HIGH:
      return 'orange'
    case AlertSeverity.CRITICAL:
      return 'red'
  }
}

export function AlertFeed() {
  const alerts = useActiveAlerts()

  return (
    <Box
      borderWidth={1}
      borderColor="#d7dce8"
      _dark={{ borderColor: '#262626', bg: '#0a0a0a' }}
      borderRadius="md"
      bg="#ffffff"
      w="100%"
      minH="258px"
    >
      <HStack justify="space-between" px={4} py={3} bg="#eaf2ff" _dark={{ bg: '#111111' }} borderTopRadius="md">
        <Heading size="sm" textTransform="uppercase" fontWeight="500" color="#344054" _dark={{ color: '#d4d4d4' }}>
          System Alerts
        </Heading>
        <Badge colorPalette={alerts.length > 0 ? 'red' : 'green'} px={2} py={1} borderRadius="md">
          {alerts.length} active
        </Badge>
      </HStack>
      <Separator borderColor="#d7dce8" _dark={{ borderColor: '#262626' }} />
      {alerts.length === 0 ? (
        <VStack minH="200px" justify="center" color="#a3aab8" _dark={{ color: '#536982' }} gap={3}>
          <Text fontSize="5xl" lineHeight="1">✓</Text>
          <Text fontSize="sm" letterSpacing="0.18em" textTransform="uppercase">
            No active alerts
          </Text>
        </VStack>
      ) : (
        <VStack align="stretch" gap={2} p={4}>
          {alerts.slice(0, 10).map((alert) => {
            const message = alert.payload?.message ?? getAlertTypeLabel(alert.type)

            return (
              <Box
                key={alert.id}
                p={2}
                borderRadius="md"
                borderWidth={1}
                borderColor={`${severityColor(alert.severity)}.200`}
                bg={`${severityColor(alert.severity)}.50`}
                _dark={{ bg: '#171717', borderColor: '#404040' }}
              >
                <HStack justify="space-between" mb={1}>
                  <Badge colorPalette={severityColor(alert.severity)} size="sm" px={2} py={1}>
                    {getAlertSeverityLabel(alert.severity)}
                  </Badge>
                  <Text fontSize="xs" color="gray.400">
                    {new Date(alert.createdAt).toLocaleTimeString()}
                  </Text>
                </HStack>
                <Text fontSize="sm">
                  {String(message)}
                </Text>
                {alert.resourceId !== 'system' && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Resource: {alert.resourceId}
                  </Text>
                )}
              </Box>
            )
          })}
        </VStack>
      )}
    </Box>
  )
}
