import type { Config } from "tailwindcss"

export default {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: "#153385", // Deep Blue
                secondary: "#48EFCF", // Teal
                accent: "#FEC514", // Yellow
                light: "#F5F7FA", // Light Gray
                dark: "#101C3F", // Navy
                pink: "#F04E98", // Bright Pink
                coral: "#FF957D", // Soft Coral
                blue: "#0B64DD", // Vivid Blue
            },
            fontFamily: {
                inter: ["Inter", "sans-serif"],
                mono: ["Space Mono", "monospace"],
                mierb: ["MierB", "sans-serif"],
            },
        },
    },
    plugins: [],
} satisfies Config
