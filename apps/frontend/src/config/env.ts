const DEFAULT_API_URL = 'http://localhost:3000'

export const FRONTEND_ENV = {
  apiUrl: import.meta.env.VITE_API_URL ?? DEFAULT_API_URL,
  wsUrl: import.meta.env.VITE_WS_URL ?? DEFAULT_API_URL,
} as const
