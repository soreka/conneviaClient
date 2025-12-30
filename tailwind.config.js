/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#A68CD4',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F2C6DE',
          foreground: '#666666',
        },
        accent: {
          DEFAULT: '#FCE4EC',
          foreground: '#A68CD4',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#22C55E',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#F59E0B',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F5F0FA',
          foreground: '#8C8C8C',
        },
        background: '#FFFFFF',
        foreground: '#666666',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#666666',
        },
        border: '#E8E0F0',
        input: '#E8E0F0',
        ring: '#A68CD4',
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        'full': '9999px',
      },
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
  presets: [require("nativewind/preset")],
};
