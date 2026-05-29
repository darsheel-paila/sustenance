/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{html,js}", "./index.html", "./app.js"],
  theme: {
    extend: {
      colors: {
        primary: "#5b7c6a",   // soft sage
        secondary: "#7c9a9b", // soft teal
        cream: "#faf8f5",
        sage: { 100: "#e8efe9", 200: "#c5d4c8", 300: "#9bb5a0", 400: "#5b7c6a", 500: "#4a6b56" },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 20px rgba(91, 124, 106, 0.08)",
        "soft-dark": "0 4px 20px rgba(0, 0, 0, 0.2)",
      },
    },
  },
  plugins: [],
}