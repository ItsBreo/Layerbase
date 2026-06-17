/**
 * Estado global de idioma + función de traducción `t`.
 *
 * - Persistido en localStorage; por defecto español.
 * - Estado en zustand para que todos los componentes se sincronicen.
 * - `t('a.b.c', { name })` resuelve por dot-path e interpola {param}.
 * - Mantiene actualizado el atributo `lang` de <html>.
 */
import { create } from 'zustand'
import { type Lang, messages } from '@/i18n/messages'

const STORAGE_KEY = 'layerbase_lang'

function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'es' || saved === 'en') return saved
  } catch {
    /* noop */
  }
  return 'es'
}

function applyLangAttr(lang: Lang): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang
  }
}

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
}

const useLangStore = create<LangState>((set) => {
  const initial = getInitialLang()
  applyLangAttr(initial)
  return {
    lang: initial,
    setLang: (lang) => {
      try {
        localStorage.setItem(STORAGE_KEY, lang)
      } catch {
        /* noop */
      }
      applyLangAttr(lang)
      set({ lang })
    },
  }
})

function resolve(dict: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, dict)
}

export type Translate = (key: string, params?: Record<string, string | number>) => string

export function useI18n(): { lang: Lang; setLang: (lang: Lang) => void; t: Translate } {
  const lang = useLangStore((s) => s.lang)
  const setLang = useLangStore((s) => s.setLang)

  const t: Translate = (key, params) => {
    const raw = resolve(messages[lang], key) ?? resolve(messages.es, key)
    if (typeof raw !== 'string') return key
    if (!params) return raw
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      raw,
    )
  }

  return { lang, setLang, t }
}
