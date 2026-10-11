// @maia:theme
// --- Theme mode (light | dark | black | system) ---------------------------
// Mirrors public/theme-boot.js, which applies the first paint. `black` is a variant of dark: the page
// is data-theme="dark" (so every dark rule still applies) plus data-variant="black" for the palette.
const STORAGE_KEY = 'maia.theme'
const MODES = ['light', 'dark', 'black', 'system']
const listeners = new Set()

const readStored = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return MODES.includes(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

let mode = readStored()
const query = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null

export const getTheme = () => mode

/** 'light' or 'dark'; black resolves to dark because it is a dark variant. */
export const resolveTheme = (m = mode) =>
  m === 'system' ? (query?.matches ? 'dark' : 'light') : m === 'black' ? 'dark' : m

export const resolveVariant = (m = mode) => (m === 'black' ? 'black' : null)

const apply = () => {
  const root = document.documentElement
  root.setAttribute('data-theme', resolveTheme())
  const variant = resolveVariant()
  if (variant) root.setAttribute('data-variant', variant)
  else root.removeAttribute('data-variant')
  listeners.forEach((fn) => fn(mode))
}

export const setTheme = (next) => {
  if (!MODES.includes(next)) return
  mode = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // storage blocked: the choice lasts for this session only
  }
  apply()
}

export const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Only follows the OS while the user hasn't picked a side.
query?.addEventListener('change', () => {
  if (mode === 'system') apply()
})
