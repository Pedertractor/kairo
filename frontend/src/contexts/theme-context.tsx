import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Palette = 'white' | 'black' | 'colorful'

const STORAGE_KEY = 'kairo-palette'
const VALID_PALETTES: Palette[] = ['white', 'black', 'colorful']

interface ThemeContextValue {
  palette: Palette
  setPalette: (palette: Palette) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function applyPaletteToDocument(palette: Palette) {
  const root = document.documentElement
  root.dataset.palette = palette
  root.classList.toggle('dark', palette === 'black')
}

function readStoredPalette(): Palette {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && VALID_PALETTES.includes(stored as Palette)) {
      return stored as Palette
    }
  } catch {
    // ignore storage errors
  }
  return 'white'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<Palette>(() => readStoredPalette())

  const setPalette = useCallback((next: Palette) => {
    setPaletteState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore storage errors
    }
    applyPaletteToDocument(next)
  }, [])

  useEffect(() => {
    applyPaletteToDocument(palette)
  }, [palette])

  const value = useMemo(
    () => ({
      palette,
      setPalette,
    }),
    [palette, setPalette],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
