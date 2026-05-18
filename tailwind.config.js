/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#fbbf24',
          dark: '#dda820',
          light: '#fbc53a',
        },
        dark: {
          DEFAULT: '#1f2937',
          gray: '#374151',
        }
      }
    },
  },
  plugins: [],
}

