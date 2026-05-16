import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../store'

export function useAlerts() {
  return useStore((s) => s.alerts)
}

export function useActiveAlerts() {
  return useStore(
    useShallow((s) => s.alerts.filter((a) => a.isActive))
  )
}
