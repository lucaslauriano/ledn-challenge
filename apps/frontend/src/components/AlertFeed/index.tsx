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
    <Box p={4} borderWidth={1} borderRadius="lg" w="100%">
      <HStack justify="space-between" mb={3}>
        <Heading size="sm">Alerts</Heading>
        <Badge colorPalette={alerts.length > 0 ? 'red' : 'green'}>
          {alerts.length} active
        </Badge>
      </HStack>
      <Separator mb={3} />
      {alerts.length === 0 ? (
        <Text fontSize="sm" color="gray.400">
          No active alerts
        </Text>
      ) : (
        <VStack align="stretch" gap={2}>
          {alerts.slice(0, 10).map((alert) => {
            const message = alert.payload?.message ?? alert.type

            return (
              <Box
                key={alert.id}
                p={2}
                borderRadius="md"
                borderWidth={1}
                borderColor={`${severityColor(alert.severity)}.200`}
                bg={`${severityColor(alert.severity)}.50`}
              >
                <HStack justify="space-between" mb={1}>
                  <Badge colorPalette={severityColor(alert.severity)} size="sm">
                    {alert.severity}
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
