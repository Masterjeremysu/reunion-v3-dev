import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      'var(--color-bg-app)',
        bg2:     'var(--color-bg-sidebar)',
        bg3:     'var(--color-bg-card)',
        bg4:     'var(--color-bg-input)',
        border:  'var(--color-border)',
        border2: 'var(--color-border2)',
        text:    'var(--color-text-main)',
        text2:   'var(--color-text-muted)',
        text3:   'var(--color-text-faded)',
        teal:    'var(--color-brand)',
        teal2:   'var(--color-brand-hover)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
