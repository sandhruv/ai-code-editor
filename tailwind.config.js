/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          light: "#ffffff",
          dark: "#1e1e1e",
        },
      },
    },
  },
  plugins: [],
};
