import type { Config } from "tailwindcss";

/**
 * Tailwind CSS Configuration
 *
 * This configuration extends the default Tailwind theme with:
 * - Custom brand colors and semantic color scales
 * - Extended spacing and typography values
 * - Custom animation utilities
 *
 * All colors use CSS variables defined in globals.css for easy theming.
 */

export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* =================================================================
         COLOR SYSTEM
         ================================================================= */
      colors: {
        /* Core UI Colors */
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        /* Brand Colors */
        brand: {
          DEFAULT: "hsl(var(--brand))",
          hover: "hsl(var(--brand-hover))",
          light: "hsl(var(--brand-light))",
        },

        /* Surface Colors */
        "surface-inverse": "hsl(var(--surface-inverse))",
        "surface-elevated": "hsl(var(--surface-elevated))",

        /* Procore Brand Colors */
        procore: {
          orange: "hsl(var(--procore-orange))",
          "orange-hover": "hsl(var(--procore-orange-hover))",
          header: "hsl(var(--procore-header))",
          "header-text": "hsl(var(--procore-header-text))",
          "info-bg": "hsl(var(--procore-info-bg))",
          "info-text": "hsl(var(--procore-info-text))",
          negative: "hsl(var(--procore-negative))",
        },

        /* Semantic Status Colors */
        status: {
          success: "hsl(var(--status-success))",
          warning: "hsl(var(--status-warning))",
          error: "hsl(var(--status-error))",
          info: "hsl(var(--status-info))",
        },

        /* Component Colors */
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          subtle: "hsl(var(--muted-subtle))",
          foreground: "hsl(var(--muted-foreground))",
        },

        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        /* Semantic Status Colors (use instead of raw color classes) */
        success: {
          DEFAULT: "hsl(var(--status-success))",
          foreground: "hsl(0 0% 100%)",
        },
        warning: {
          DEFAULT: "hsl(var(--status-warning))",
          foreground: "hsl(0 0% 100%)",
        },
        info: {
          DEFAULT: "hsl(var(--status-info))",
          foreground: "hsl(0 0% 100%)",
        },
        link: {
          DEFAULT: "hsl(var(--status-info))",
          hover: "hsl(214 80% 42%)",
        },

        /* Form Colors */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        /* Chart Colors */
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        /* Sidebar Colors (required for shadcn sidebar/dashboard blocks) */
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },

      /* =================================================================
         BORDER RADIUS
         ================================================================= */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      /* =================================================================
         TYPOGRAPHY
         ================================================================= */
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "Monaco", "Liberation Mono", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.75rem" }], // 10px
      },
      letterSpacing: {
        "widest-plus": "0.2em",
        "wide-plus": "0.15em",
      },
      lineHeight: {
        "tighter": "1.05",
      },

      /* =================================================================
         SPACING & SIZING
         ================================================================= */
      maxWidth: {
        "8xl": "1800px",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },

      /* =================================================================
         ANIMATIONS
         ================================================================= */
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
      },

      /* =================================================================
         SHADOWS
         ================================================================= */
      boxShadow: {
        "card-hover": "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("tailwind-scrollbar-hide"),
  ],
} satisfies Config;
