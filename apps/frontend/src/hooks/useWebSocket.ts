import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { WsEvent } from '@ledn/shared'
import type { PriceRecord, LiquiditySnapshot, Alert, CircuitState, FeedMode } from '@ledn/shared'
import { useStore } from '../store'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000'

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const {
      setConnected,
      updatePrice,
      setLiquidity,
      addAlert,
      setCircuitState,
      setFeedMode,
      setPrices,
    } = useStore.getState()

    const socket = io(WS_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('initial_state', (data: {
      prices: Record<string, PriceRecord>
      liquidity: LiquiditySnapshot
      alerts: Alert[]
    }) => {
      setPrices(data.prices)
      setLiquidity(data.liquidity)
      data.alerts.forEach(addAlert)
    })

    socket.on(WsEvent.PRICE_UPDATED, (price: PriceRecord) => {
      updatePrice(price.assetId, price)
    })

    socket.on(WsEvent.LIQUIDITY_UPDATED, (liquidity: LiquiditySnapshot) => {
      setLiquidity(liquidity)
    })

    socket.on(WsEvent.ALERT_CREATED, (alert: Alert) => {
      addAlert(alert)
    })

    socket.on(WsEvent.CIRCUIT_STATE_CHANGED, (data: {
      assetId: string
      state: string
    }) => {
      setCircuitState(data.assetId, data.state as CircuitState)
    })

    socket.on(WsEvent.FEED_STATUS_CHANGED, (data: {
      assetId: string
      mode: string
    }) => {
      setFeedMode(data.assetId, data.mode as FeedMode)
    })

    return () => {
      socket.disconnect()
    }
  }, [])
}