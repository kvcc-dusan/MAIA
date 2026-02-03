/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,html}"],
  theme: {
    extend: {
      colors: {
        'maia-bg-base': 'var(--color-bg-base)',
        'maia-bg-subtle': 'var(--color-bg-subtle)',
        'maia-surface': 'var(--color-bg-surface)',
        'maia-bg-glass': 'var(--color-bg-glass)',
        'maia-bg-glass-heavy': 'var(--color-bg-glass-heavy)',

        'maia-text-primary': 'var(--color-text-primary)',
        'maia-text-secondary': 'var(--color-text-secondary)',
        'maia-text-muted': 'var(--color-text-muted)',
        'maia-text-inverted': 'var(--color-text-inverted)',

        'maia-border-subtle': 'var(--color-border-subtle)',
        'maia-border-default': 'var(--color-border-default)',
        'maia-border-highlight': 'var(--color-border-highlight)',

        'maia-emerald': 'var(--color-emerald)',
        'maia-amber': 'var(--color-amber)',
        'maia-rose': 'var(--color-rose)',
        'maia-sky': 'var(--color-sky)',
        'maia-violet': 'var(--color-violet)',
      }
    }
  },
  plugins: [],
};
