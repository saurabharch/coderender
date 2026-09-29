import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0d9488", soft: "#ccfbf1", deep: "#0f766e" },
      },
    },
  },
  plugins: [],
} satisfies Config;
