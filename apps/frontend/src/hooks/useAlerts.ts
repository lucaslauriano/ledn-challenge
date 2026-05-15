import { useStore } from '../store'

export function useAlerts() {
  return useStore((s) => s.alerts)
}

export function useActiveAlerts() {
  return useStore((s) => s.alerts.filter((a) => !a.resolved))
}