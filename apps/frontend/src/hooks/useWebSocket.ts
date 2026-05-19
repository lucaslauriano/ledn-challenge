import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import {
  CircuitState,
  FeedMode,
  WS_EVENT_CHANNEL,
  WsEventType,
  type AlertEvent,
  type LiquiditySnapshot,
  type PriceRecord,
  type SettlementSnapshot,
  type WsEvent,
} from '@ledn/shared'
import { useStore } from '../store'
import { FRONTEND_ENV } from '../config/env'

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const {
      setConnected,
      updatePrice,
      setLiquidity,
      setAlerts,
      addAlert,
      resolveAlert,
      setCircuitStates,
      setCircuitState,
      setFeedModes,
      setFeedMode,
      setPrices,
      setSettlements,
    } = useStore.getState()

    const socket = io(FRONTEND_ENV.wsUrl, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on(WS_EVENT_CHANNEL, (event: WsEvent) => {
      switch (event.type) {
        case WsEventType.INITIAL_STATE: {
          const data = event.payload as {
            prices: Record<string, PriceRecord>
            liquidity: LiquiditySnapshot
            alerts: AlertEvent[]
            settlements: SettlementSnapshot
            circuitStates?: Record<string, CircuitState>
            feedModes?: Record<string, FeedMode>
          }
          setPrices(data.prices)
          setLiquidity(data.liquidity)
          setSettlements(data.settlements)
          setAlerts(data.alerts)
          if (data.circuitStates) {
            setCircuitStates(data.circuitStates)
          }
          if (data.feedModes) {
            setFeedModes(data.feedModes)
          }
          break
        }
        case WsEventType.PRICE_UPDATED: {
          const price = event.payload as PriceRecord
          updatePrice(price.assetId, price)
          break
        }
        case WsEventType.LIQUIDITY_SNAPSHOT: {
          setLiquidity(event.payload as LiquiditySnapshot)
          break
        }
        case WsEventType.ALERT_CREATED: {
          addAlert(event.payload as AlertEvent)
          break
        }
        case WsEventType.ALERT_RESOLVED: {
          const alert = event.payload as AlertEvent
          resolveAlert(alert.id)
          break
        }
        case WsEventType.CIRCUIT_STATE_CHANGED: {
          const data = event.payload as {
            assetId: string
            state: CircuitState
          }
          setCircuitState(data.assetId, data.state)
          break
        }
        case WsEventType.FEED_STATUS_CHANGED: {
          const data = event.payload as {
            assetId: string
            mode: FeedMode
          }
          setFeedMode(data.assetId, data.mode)
          break
        }
        case WsEventType.SETTLEMENTS_UPDATED: {
          setSettlements(event.payload as SettlementSnapshot)
          break
        }
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [])
}
