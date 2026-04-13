/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: '#0f766e', // Mã màu xanh ngọc chuẩn theo thiết kế Figma của bạn
      }
    },
  },
  plugins: [],
}