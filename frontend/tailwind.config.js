/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'kalshi-dark': '#0a0f1a',
        'kalshi-darker': '#050810',
        'kalshi-card': '#111827',
        'kalshi-accent': '#06b6d4',
        'kalshi-buy': '#10b981',
        'kalshi-sell': '#ef4444',
        'kalshi-hold': '#6b7280',
        'kalshi-gold': '#f59e0b',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'display': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
