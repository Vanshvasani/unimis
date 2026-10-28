import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        ink: { DEFAULT: "#0b0f17", 900: "#070a0f" },
        surface: { DEFAULT: "#121824", muted: "#1a2233" },
        saffron: { 400: "#f59e0b", 500: "#d97706", 600: "#b45309" },
        indigo: { 600: "#f59e0b", 700: "#d97706" },
        gray: {
          50: "#0b0f17",
          100: "#121824",
          200: "#1e293b",
          300: "#334155",
          400: "#64748b",
          500: "#94a3b8",
          600: "#94a3b8",
          700: "#cbd5e1",
          800: "#e2e8f0",
          900: "#f8fafc",
        },
      },
    },
  },
  plugins: [],
};
export default config;
