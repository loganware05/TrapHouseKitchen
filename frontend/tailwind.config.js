/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        th: {
          surface: '#fafafa',
          'surface-elevated': '#ffffff',
          'surface-muted': '#f4f4f5',
          muted: '#e4e4e7',
          border: '#e4e4e7',
          'muted-fg': '#71717a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'th-display': ['1.75rem', { lineHeight: '2.125rem', fontWeight: '700' }],
        'th-title': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '700' }],
        'th-body': ['0.9375rem', { lineHeight: '1.5rem' }],
        'th-caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
      },
      spacing: {
        'th-section': '1.5rem',
        'th-card-pad': '1rem',
        'nav-mobile': '4rem',
      },
      borderRadius: {
        'th-sm': '0.5rem',
        'th-md': '0.75rem',
        'th-lg': '1rem',
        'th-xl': '1.25rem',
        'th-2xl': '1.5rem',
      },
      boxShadow: {
        'th-card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'th-float': '0 10px 40px -10px rgb(0 0 0 / 0.2)',
      },
    },
  },
  plugins: [],
}
