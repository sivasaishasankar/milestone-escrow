import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: "#fdfaf3",
          100: "#f8f1e0",
          200: "#efe2c4",
          300: "#e2cd9c",
        },
        ink: {
          900: "#2a2419",
          700: "#463c29",
          500: "#6b5d40",
        },
        trail: {
          locked: "#b8a888",
          released: "#3f6b4a",
          disputed: "#a8432f",
        },
        pine: {
          600: "#3f6b4a",
          700: "#2f5138",
        },
        rust: {
          600: "#a8432f",
          700: "#8a3524",
        },
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "serif"],
      },
      backgroundImage: {
        "topo-lines":
          "repeating-radial-gradient(circle at 20% 15%, transparent 0, transparent 26px, rgba(107,93,64,0.06) 27px)",
      },
    },
  },
  plugins: [],
};
export default config;
