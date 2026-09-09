import { DEFAULT_SETTINGS, type UserSettings } from '@/lib/settings'

const CACHE_KEY = 'gm-appearance'

type Appearance = UserSettings['appearance']

/** Push appearance onto <html> as classes + data-attrs that index.css keys off. */
export function applyAppearance(a: Appearance): void {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = a.theme === 'dark' || (a.theme === 'system' && prefersDark)

  root.classList.toggle('dark', dark)
  root.dataset.accent = a.accent
  root.dataset.density = a.density
  root.dataset.fontSize = a.fontSize
  root.dataset.reduceMotion = a.reduceMotion ? 'true' : 'false'
}

/** Remember the last-known appearance so the next launch paints correctly before settings load. */
export function cacheAppearance(a: Appearance): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(a))
  } catch {
    /* private mode / disabled storage */
  }
}

/** Apply the cached (or default) appearance immediately on boot — call once from main.tsx. */
export function bootstrapAppearance(): void {
  let a = DEFAULT_SETTINGS.appearance
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) a = { ...a, ...(JSON.parse(raw) as Partial<Appearance>) }
  } catch {
    /* ignore */
  }
  applyAppearance(a)
}
