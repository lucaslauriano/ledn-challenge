import {
  AlertSeverity,
  AlertType,
  CircuitState,
  DataConfidence,
  FeedMode,
  LiquidityConfidence,
  PriceSource,
  SettlementScenario,
  SettlementStatus,
} from '@ledn/shared'

type AuditEntryType =
  | 'LOCK'
  | 'RELEASE'
  | 'SETTLEMENT_START'
  | 'SETTLEMENT_SETTLE'
  | 'SETTLEMENT_FAIL'

const alertSeverityLabels: Record<AlertSeverity, string> = {
  [AlertSeverity.MEDIUM]: 'Medium',
  [AlertSeverity.HIGH]: 'High',
  [AlertSeverity.CRITICAL]: 'Critical',
}

const alertTypeLabels: Record<AlertType, string> = {
  [AlertType.CIRCUIT_OPEN]: 'Circuit breaker open',
  [AlertType.DATA_STALE]: 'Data stale',
  [AlertType.FEED_OFFLINE]: 'Feed offline',
  [AlertType.PRICE_DRIFT]: 'Price drift detected',
  [AlertType.LIQUIDITY_LOW]: 'Liquidity low',
  [AlertType.LIQUIDITY_SOURCE_STALE]: 'Liquidity source stale',
  [AlertType.SETTLEMENT_DELAYED]: 'Settlement delayed',
  [AlertType.SETTLEMENT_FAILED]: 'Settlement failed',
  [AlertType.SETTLEMENT_EXPOSURE_BREACH]: 'Settlement exposure breach',
}

const circuitStateLabels: Record<CircuitState, string> = {
  [CircuitState.CLOSED]: 'Closed',
  [CircuitState.HALF_OPEN]: 'Half open',
  [CircuitState.OPEN]: 'Open',
}

const feedModeLabels: Record<FeedMode, string> = {
  [FeedMode.HEALTHY]: 'Healthy',
  [FeedMode.DELAYED]: 'Delayed',
  [FeedMode.DRIFTED]: 'Drifted',
  [FeedMode.OFFLINE]: 'Offline',
}

const dataConfidenceLabels: Record<DataConfidence, string> = {
  [DataConfidence.FRESH]: 'Fresh',
  [DataConfidence.STALE]: 'Stale',
  [DataConfidence.ESTIMATED]: 'Estimated',
}

const liquidityConfidenceLabels: Record<LiquidityConfidence, string> = {
  [LiquidityConfidence.FRESH]: 'Fresh',
  [LiquidityConfidence.DEGRADED]: 'Degraded',
}

const priceSourceLabels: Record<PriceSource, string> = {
  [PriceSource.LIVE]: 'Live',
  [PriceSource.CACHE]: 'Cache',
  [PriceSource.FALLBACK]: 'Fallback',
  [PriceSource.REFERENCE]: 'Reference',
}

const settlementStatusLabels: Record<SettlementStatus, string> = {
  [SettlementStatus.CREATED]: 'Created',
  [SettlementStatus.BOOKED]: 'Booked',
  [SettlementStatus.LOCKED]: 'Locked',
  [SettlementStatus.SUBMITTED]: 'Submitted',
  [SettlementStatus.PENDING_SETTLEMENT]: 'Pending settlement',
  [SettlementStatus.SETTLED]: 'Settled',
  [SettlementStatus.FAILED]: 'Failed',
}

const settlementScenarioLabels: Record<SettlementScenario, string> = {
  [SettlementScenario.NORMAL]: 'Normal flow',
  [SettlementScenario.DELAYED]: 'Delayed flow',
  [SettlementScenario.FAILED]: 'Failed flow',
}

const auditEntryLabels: Record<AuditEntryType, string> = {
  LOCK: 'Locked funds',
  RELEASE: 'Released funds',
  SETTLEMENT_START: 'Settlement started',
  SETTLEMENT_SETTLE: 'Settlement settled',
  SETTLEMENT_FAIL: 'Settlement failed',
}

function fallbackLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getAlertSeverityLabel(severity: AlertSeverity): string {
  return alertSeverityLabels[severity]
}

export function getAlertTypeLabel(type: AlertType): string {
  return alertTypeLabels[type]
}

export function getCircuitStateLabel(state: CircuitState): string {
  return circuitStateLabels[state]
}

export function getFeedModeLabel(mode: FeedMode): string {
  return feedModeLabels[mode]
}

export function getDataConfidenceLabel(confidence: DataConfidence): string {
  return dataConfidenceLabels[confidence]
}

export function getLiquidityConfidenceLabel(
  confidence: LiquidityConfidence,
): string {
  return liquidityConfidenceLabels[confidence]
}

export function getPriceSourceLabel(source: PriceSource | string): string {
  return priceSourceLabels[source as PriceSource] ?? fallbackLabel(source)
}

export function getSettlementStatusLabel(status: SettlementStatus): string {
  return settlementStatusLabels[status]
}

export function getSettlementScenarioLabel(
  scenario: SettlementScenario,
): string {
  return settlementScenarioLabels[scenario]
}

export function getAuditEntryLabel(type: AuditEntryType): string {
  return auditEntryLabels[type] ?? fallbackLabel(type)
}
