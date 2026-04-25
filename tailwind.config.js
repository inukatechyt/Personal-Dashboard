/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0f172a',      
        darkCard: '#1e293b',    
        auraBlue: '#3b82f6',    
      },
      boxShadow: {
        'aura-blue': '0 0 15px rgba(59, 130, 246, 0.4)', 
      }
    },
  },
  plugins: [],
}