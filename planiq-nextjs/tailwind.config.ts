import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sora: ['Sora', 'system-ui', 'sans-serif'],
        dm: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        purple: {
          DEFAULT: '#6C5CE7',
          dark: '#5549C7',
          light: 'rgba(108,92,231,0.12)',
          mid: '#9580F0',
        },
        coral: '#FF6B8A',
        mint: '#00CEC9',
        amber: '#FDCB6E',
        sky: '#74B9FF',
        planiq: {
          bg: '#F5F7FF',
          surf: '#FFFFFF',
          surf2: '#EEF0FF',
          dark: '#1A1060',
          mid: '#6860B8',
          lite: '#B0ABDD',
          border: 'rgba(108,92,231,0.10)',
        },
      },
      borderRadius: {
        '2xl': '22px',
        xl: '16px',
        lg: '12px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(108,92,231,0.10)',
        'card-sm': '0 2px 12px rgba(108,92,231,0.07)',
        btn: '0 8px 24px rgba(139,124,246,0.40)',
      },
      backgroundImage: {
        'planiq-gradient': 'linear-gradient(135deg, #6C5CE7 0%, #A78BFA 100%)',
        'planiq-gradient-soft':
          'linear-gradient(135deg, rgba(108,92,231,.15) 0%, rgba(167,139,250,.10) 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
