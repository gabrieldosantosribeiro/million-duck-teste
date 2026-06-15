/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FFD43B',
        'primary-light': '#FFF4B8',
        text: '#1F1F1F',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      tracking: {
        tight: '-0.02em',
        tighter: '-0.04em',
      },
      maxWidth: {
        grid: '1000px',
      },
    },
  },
  plugins: [],
}
