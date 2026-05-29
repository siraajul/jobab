import type { Config } from 'tailwindcss';

/**
 * NativeWind theme — same token names as the web's Tailwind config so the
 * design language stays unified. We use static colors here (rather than CSS
 * vars) since NativeWind doesn't run a CSS variable system.
 */
const lightTokens = {
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  surface2: '#F4EFE6',
  surface3: '#ECE5D8',
  ink: '#2A2722',
  ink2: '#6C645A',
  ink3: '#9B9285',
  border: '#EBE4D7',
  border2: '#DDD4C4',
  accent: '#1F6E47',
  accentSoft: '#E2EBE4',
  amber: '#9A6B0E',
  amberBg: '#F6EDD6',
  red: '#AE3A2C',
  paid: '#2E7D4F',
  paidBg: '#E4EFE6',
  you: '#3C4A86',
};

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: lightTokens,
      fontFamily: {
        display: ['Bricolage-Grotesque', 'System'],
        body: ['Hind-Siliguri', 'System'],
      },
    },
  },
  plugins: [],
} satisfies Config;
