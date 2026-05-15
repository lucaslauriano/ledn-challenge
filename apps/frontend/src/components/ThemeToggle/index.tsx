import { Button } from '@chakra-ui/react'
import { useState } from 'react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.setAttribute(
      'data-theme',
      next ? 'dark' : 'light'
    )
  }

  return (
    <Button px={2} size="sm" variant="outline" onClick={toggle}>
      {isDark ? '☀️ Light' : '🌙 Dark'}
    </Button>
  )
}