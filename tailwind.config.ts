import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        reader: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "#e5e5e5",
        muted: "#737373",
        foreground: "#171717",
        background: "#ffffff",
        nav: { bg: "#171717", text: "#ffffff" },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
