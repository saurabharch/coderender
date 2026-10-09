import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
          deep: "rgb(var(--brand-deep) / <alpha-value>)",
        },
      },
      borderRadius: {
        brand: "var(--brand-radius, 12px)",
      },
      boxShadow: {
        brand: "var(--brand-shadow)",
      },
      spacing: {
        brand: "var(--brand-space, 8px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
