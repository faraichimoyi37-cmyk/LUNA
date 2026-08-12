import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translations, type Lang } from '../i18n/translations'

export type { Lang }

interface I18nState {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
      t: (key) => translations[get().lang][key] ?? translations.en[key] ?? key,
    }),
    { name: 'luna-lang' },
  ),
)
