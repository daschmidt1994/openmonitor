import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        up: "#16a34a",
        down: "#dc2626",
        pending: "#eab308",
        paused: "#64748b",
      },
    },
  },
  plugins: [],
};

export default config;
