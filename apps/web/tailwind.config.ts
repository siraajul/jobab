import type { Config } from 'tailwindcss';

/**
 * Tailwind config — the design tokens from /app.css live here.
 * Semantic colors are wired to CSS variables (--bg, --surface, --ink, --accent,
 * etc.) so .theme-light / .theme-dark on <body> swaps the entire palette without
 * Tailwind needing dark: variants on every utility.
 */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        border: 'var(--border)',
        'border-2': 'var(--border-2)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'accent-line': 'var(--accent-line)',
        'accent-ink': 'var(--accent-ink)',
        'on-accent': 'var(--on-accent)',
        amber: 'var(--amber)',
        'amber-bg': 'var(--amber-bg)',
        red: 'var(--red)',
        'red-bg': 'var(--red-bg)',
        paid: 'var(--paid)',
        'paid-bg': 'var(--paid-bg)',
        you: 'var(--you)',
        'you-bg': 'var(--you-bg)',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Hind Siliguri"', 'sans-serif'],
        body: ['"Hind Siliguri"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
      },
      letterSpacing: { display: '-0.02em' },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      borderRadius: { pill: '999px' },
      keyframes: {
        'jb-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.35)', opacity: '0.55' },
        },
        'jb-rise': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'jb-slidein': {
          from: { opacity: '0', transform: 'translateX(18px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'jb-pulse': 'jb-pulse 2.4s ease-in-out infinite',
        'jb-rise': 'jb-rise 0.42s cubic-bezier(.2,.8,.25,1) both',
        'jb-slidein': 'jb-slidein 0.5s cubic-bezier(.2,.8,.25,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
