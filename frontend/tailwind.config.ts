import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-sans)', ...fontFamily.sans],
        display: ['var(--font-display)', ...fontFamily.sans],
        mono:    ['JetBrains Mono', ...fontFamily.mono],
      },
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        carbon: {
          DEFAULT: 'hsl(var(--carbon))',
          mid:     'hsl(var(--carbon-mid))',
        },
        neon: {
          orange: 'hsl(var(--neon-orange))',
          cyan:   'hsl(var(--neon-cyan))',
          green:  'hsl(var(--neon-green))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.3s ease-out',
        'slide-up':       'slide-up 0.3s ease-out',
        'spin-slow':      'spin 3s linear infinite',
        'pulse-neon':     'pulse-neon 2s ease-in-out infinite',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px hsl(var(--neon-orange)/0.4)' },
          '50%':      { boxShadow: '0 0 20px hsl(var(--neon-orange)/0.8), 0 0 40px hsl(var(--neon-orange)/0.2)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'carbon-weave': `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 2px,
          hsl(220 8% 10%) 2px,
          hsl(220 8% 10%) 4px
        )`,
      },
    },
  },
  plugins: [],
}

export default config
