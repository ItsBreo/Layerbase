/**
 * Estado global de tema (claro/oscuro) con persistencia y transición suave.
 *
 * - Se guarda en localStorage; por defecto arranca en oscuro (estética premium).
 * - El cambio NO es brusco: si el navegador soporta la View Transitions API, el
 *   cambio se hace dentro de `startViewTransition` (crossfade nativo de toda la
 *   página). Si no, se activa temporalmente una clase con transiciones CSS.
 * - La clase `dark` se aplica también desde un script inline en index.html para
 *   evitar el parpadeo inicial (FOUC); aquí solo la sincronizamos.
 */
import { create } from 'zustand'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'layerbase_theme'

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* localStorage no disponible */
  }
  return 'dark'
}

function applyThemeClass(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function persist(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* noop */
  }
}

/** Ejecuta el cambio de tema con una animación no brusca. */
function animateThemeChange(apply: () => void): void {
  const docWithVT = document as Document & {
    startViewTransition?: (cb: () => void) => void
  }

  if (typeof docWithVT.startViewTransition === 'function') {
    docWithVT.startViewTransition(apply)
    return
  }

  // Fallback: transiciones CSS temporales sobre color/fondo/borde.
  const root = document.documentElement
  root.classList.add('theme-transition')
  apply()
  window.setTimeout(() => root.classList.remove('theme-transition'), 450)
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    persist(theme)
    animateThemeChange(() => {
      applyThemeClass(theme)
      set({ theme })
    })
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}))
