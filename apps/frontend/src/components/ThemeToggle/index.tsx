import { Button } from '@chakra-ui/react'
import { useColorMode } from '../ui/use-color-mode'

export function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <Button size="sm" px={3} variant="outline" onClick={toggleColorMode}>
      {colorMode === 'dark' ? '🌙 Dark' : '☀️ Light'}
    </Button>
  )
}
