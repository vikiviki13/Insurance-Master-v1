/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"] },
      colors: {
        brand: { DEFAULT: "#00489B", dark: "#002C66", soft: "#E8F0FA" },
        ink: "#101828",
        muted: "#475467",
        subtle: "#71717A",
        line: "#E4E4E7",
        canvas: "#F9F9F9",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(16,24,40,0.05)",
        card: "0 1px 2px rgba(16,24,40,0.05)",
        nav: "0 16px 44px rgba(0,0,0,0.07)",
      },
    },
  },
  plugins: [],
};
