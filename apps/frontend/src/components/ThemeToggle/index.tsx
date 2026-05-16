import { Button } from '@chakra-ui/react'
import { useColorMode } from '../ui/use-color-mode'

export function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <Button
      size="xs"
      px={3}
      variant="outline"
      borderColor="#d7dce8"
      _dark={{ borderColor: '#404040', color: '#fafafa', _hover: { bg: '#171717' } }}
      onClick={toggleColorMode}
    >
      {colorMode === 'dark' ? 'Dark' : 'Light'}
    </Button>
  )
}
