const animate = require("tailwindcss-animate");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,html}"],
  theme: {
    extend: {
      colors: {
        midnight: '#050505',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      fontFamily: {
        mono: ['var(--font-mono)'],
        sans: ['var(--font-sans)'],
      },
      fontSize: {
        'fluid-3xs': 'var(--fluid-3xs)',
        'fluid-2xs': 'var(--fluid-2xs)',
        'fluid-xs': 'var(--fluid-xs)',
        'fluid-sm': 'var(--fluid-sm)',
        'fluid-base': 'var(--fluid-base)',
        'fluid-lg': 'var(--fluid-lg)',
        'fluid-xl': 'var(--fluid-xl)',
        'fluid-2xl': 'var(--fluid-2xl)',
        'fluid-3xl': 'var(--fluid-3xl)',
      },
      spacing: {
        'fluid-xs': 'clamp(0.25rem, 0.15rem + 0.4vw, 0.5rem)',
        'fluid-sm': 'clamp(0.5rem, 0.3rem + 0.6vw, 0.75rem)',
        'fluid-md': 'clamp(0.75rem, 0.5rem + 0.8vw, 1.25rem)',
        'fluid-lg': 'clamp(1rem, 0.7rem + 1vw, 1.75rem)',
        'fluid-xl': 'clamp(1.5rem, 1rem + 1.5vw, 2.5rem)',
        'fluid-page': 'var(--space-fluid-page)',
        'fluid-section': 'var(--space-fluid-section)',
        'fluid-gap': 'var(--space-fluid-gap)',
        'dock': 'var(--dock-h)',
        'dock-desktop': 'var(--dock-h-desktop)',
      }
    }
  },
  plugins: [animate],
};
