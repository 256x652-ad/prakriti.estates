import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Indian Real Estate Palette
        prakriti: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a', // Primary Brand Green
          700: '#15803d',
          800: '#166534',
          900: '#14532d', // Trust/Corporate Green
          950: '#052e16',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b', // Prakriti Certified Badge
          600: '#d97706',
        },
        surface: {
          light: '#f8fafc',
          DEFAULT: '#ffffff',
          dark: '#0f172a',
        }
      },
      fontFamily: {
        // Engineering/Trust aesthetic
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'], 
      },
      boxShadow: {
        'premium': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'float': '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
      }
    },
  },
  plugins: [],
};

export default config;
