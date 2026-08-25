/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        panel: '0 20px 60px rgba(0,0,0,.28)',
      },
    },
  },
  plugins: [],
}
