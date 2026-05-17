import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

function getManualChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined

  if (
    id.includes('/react/') ||
    id.includes('/react-dom/') ||
    id.includes('/scheduler/')
  )
    return 'react-vendor'

  if (
    id.includes('@chakra-ui') ||
    id.includes('@emotion') ||
    id.includes('framer-motion') ||
    id.includes('@ark-ui') ||
    id.includes('@zag-js')
  )
    return 'chakra-vendor'

  if (
    id.includes('socket.io-client') ||
    id.includes('engine.io-client') ||
    id.includes('@socket.io')
  )
    return 'socket-vendor'

  return 'vendor'
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ledn/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: getManualChunk,
      },
    },
  },
})