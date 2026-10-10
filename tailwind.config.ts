import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', card: 'var(--card)', tx: 'var(--tx)', mu: 'var(--mu)',
        ac: 'var(--ac)', ln: 'var(--ln)', ink: '#030F26',
        navy: '#030F26', 'navy-card': '#0A1938', sun: '#FFC400', 'sun-hover': '#E0AC00', parchment: '#FDFBF7',
      },
      fontFamily: { sans: ['var(--font-lexend)', 'system-ui', 'sans-serif'], display: ['var(--font-fredoka)', 'var(--font-lexend)', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
