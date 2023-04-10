const colors = require('tailwindcss/colors')

module.exports = {
  content: [
    './components/**/*.js',
    './pages/**/*.js',
    './styles/globals.css',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'spin-one-time': 'spin 0.3s linear',
      },
      colors: {
        ...colors,
        dark: '#000000',
        light: '#ffffff',
        black: '#1a1919',
        white: '#ececec',
        slate: {
          ...colors.slate,
          900: '#1d1c1c',
          800: '#292929',
          700: '#343434',
          600: '#4a4a4a',
          500: '#a5a5a5',
          400: '#b5b5b5',
          300: '#cbcbcb',
          200: '#d6d6d6',
          100: '#e1e1e1',
          50: '#f0f0f0',
        },
      },
      screens: {
        '3xl': '2500px',
      },
    },
  },
}