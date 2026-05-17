import { useTheme } from 'next-themes'

export type ColorMode = 'light' | 'dark'

export type UseColorModeReturn = {
  colorMode: ColorMode
  setColorMode: (mode: ColorMode) => void
  toggleColorMode: () => void
}

export function useColorMode(): UseColorModeReturn {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme()
  const colorMode = (forcedTheme ?? resolvedTheme) as ColorMode

  return {
    colorMode,
    setColorMode: setTheme,
    toggleColorMode: () => {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    },
  }
}
