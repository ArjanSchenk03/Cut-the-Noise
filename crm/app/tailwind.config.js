/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", "Arial", "sans-serif"],
      },
      colors: {
        // Cut the Noise huisstijl
        ctn: {
          black: "#0A0A0A",
          offwhite: "#F7F4EE",
          gold: "#A8762A",
          goldlight: "#C99A4A",
          gray: "#6B6B66",
          sand: "#EFE9DD", // lichte accent-achtergrond
          line: "#E2DBCD", // warme randkleur
        },
        // Funnel-fase kleuren
        stage: {
          lead: "#94a3b8",
          afspraak: "#38bdf8",
          offerte: "#818cf8",
          onderhandeling: "#f59e0b",
          won: "#22c55e",
          lost: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
