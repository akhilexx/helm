import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: { 950: "#07090d", 900: "#0f1420", 800: "#171e2e", 700: "#1f2738", 600: "#273149" },
        fog: "#8f9bb5",
        paper: "#f6f3ec",
        gold: "#f0b429",
        acc: "#4da3ff",
        ok: "#38c172",
        bad: "#ef5b5b"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      }
    }
  },
  plugins: []
};
export default config;
