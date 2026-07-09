/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Funnel-fase kleuren (aanpasbaar aan jullie huisstijl)
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
