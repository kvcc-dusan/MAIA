// @maia:theme
// --- Theme mode (light | dark | system) ---------------------------------
// Mirrors public/theme-boot.js, which applies the first paint.
const STORAGE_KEY = 'maia.theme'
const MODES = ['light', 'dark', 'system']
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

export const resolveTheme = (m = mode) =>
  m === 'system' ? (query?.matches ? 'dark' : 'light') : m

const apply = () => {
  document.documentElement.setAttribute('data-theme', resolveTheme())
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
