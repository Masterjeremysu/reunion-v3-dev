import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0f1117',
        bg2:     '#181c27',
        bg3:     '#1e2333',
        bg4:     '#252b3d',
        border:  'rgba(255,255,255,0.07)',
        border2: 'rgba(255,255,255,0.12)',
        text:    '#e8eaf0',
        text2:   '#8b90a4',
        text3:   '#565c75',
        teal:    '#1D9E75',
        teal2:   '#5DCAA5',
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
