import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        agamotto: {
          // green palette inspired by the Eye of Agamotto
          50: "#ebfff5",
          100: "#c6ffe2",
          300: "#5ef0a8",
          400: "#22d97e",
          500: "#13b961",
          600: "#0a8f4b",
          700: "#066c39",
          900: "#012516",
        },
        mystic: {
          50: "#f4f1ff",
          400: "#9a78ff",
          500: "#7b52ff",
          700: "#4221c4",
          900: "#1a0a4a",
        },
        canvas: {
          950: "#06090d",
          900: "#0b1117",
          800: "#11181f",
          700: "#1a2330",
          500: "#3a4756",
        },
      },
      fontFamily: {
        display: ['"Cinzel"', "serif"],
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 30px rgba(34,217,126,.35)",
        glowSoft: "0 0 60px rgba(123,82,255,.18)",
      },
      backgroundImage: {
        "eye-radial": "radial-gradient(circle at center, rgba(34,217,126,.18), transparent 60%)",
      },
    },
  },
  plugins: [],
};
export default config;
