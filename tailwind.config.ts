import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // === COLORI BASE ===
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        "surface-secondary": "hsl(var(--surface-secondary))",

        // === COLORI SEMANTICI ===
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          muted: "hsl(var(--primary-muted))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          muted: "hsl(var(--success-muted))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          muted: "hsl(var(--warning-muted))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          muted: "hsl(var(--destructive-muted))",
        },

        // === COLORI INTERFACCIA ===
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          border: "hsl(var(--card-border))",
          transparent: "hsl(var(--card-transparent))",
        },

        // === SIDEBAR ===
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },

      // === SPAZIATURE ===
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)', 
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
      },

      // === GEOMETRIA ===
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // === TIPOGRAFIA ===
      fontSize: {
        'xs': 'var(--font-size-xs)',
        'sm': 'var(--font-size-sm)',
        'base': 'var(--font-size-base)',
        'lg': 'var(--font-size-lg)',
        'xl': 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
        '4xl': 'var(--font-size-4xl)',
      },
      fontWeight: {
        'normal': 'var(--font-weight-normal)',
        'medium': 'var(--font-weight-medium)',
        'semibold': 'var(--font-weight-semibold)',
        'bold': 'var(--font-weight-bold)',
      },
      lineHeight: {
        'tight': 'var(--line-height-tight)',
        'normal': 'var(--line-height-normal)',
        'relaxed': 'var(--line-height-relaxed)',
      },

      // === OMBRE ===
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'glow': 'var(--shadow-glow)',
      },

      // === TRANSIZIONI ===
      transitionDuration: {
        'fast': 'var(--transition-fast)',
        'normal': 'var(--transition-normal)',
        'slow': 'var(--transition-slow)',
      },

      // === ANIMAZIONI ===
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "wiggle": {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "10%": { transform: "scale(1.2) rotate(0deg)" },
          "20%": { transform: "scale(1.2) rotate(10deg)" },
          "30%": { transform: "scale(1.2) rotate(-10deg)" },
          "40%": { transform: "scale(1.2) rotate(10deg)" },
          "50%": { transform: "scale(1.2) rotate(-10deg)" },
          "60%": { transform: "scale(1.2) rotate(10deg)" },
          "70%": { transform: "scale(1.2) rotate(-10deg)" },
          "80%": { transform: "scale(1.2) rotate(0deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
        "line-bounce": {
          "0%": { 
            transform: "translateX(0) scaleX(1)",
            transformOrigin: "left",
            backgroundImage: "linear-gradient(to right, hsl(0, 0%, 100%, 0.65), hsl(0, 0%, 0%) 40%, transparent)"
          },
          "8%": { 
            transform: "translateX(15%) scaleX(1)",
            transformOrigin: "left",
            backgroundImage: "linear-gradient(to right, hsl(0, 0%, 100%, 0.65), hsl(0, 0%, 0%) 40%, transparent)"
          },
          "50%": { 
            transform: "translateX(90%) scaleX(0.017)",
            transformOrigin: "left",
            backgroundImage: "linear-gradient(to right, hsl(0, 0%, 100%, 0.65), hsl(0, 0%, 0%) 40%, transparent)"
          },
          "92%": { 
            transform: "translateX(15%) scaleX(1)",
            transformOrigin: "left",
            backgroundImage: "linear-gradient(to right, hsl(0, 0%, 100%, 0.65), hsl(0, 0%, 0%) 40%, transparent)"
          },
          "100%": { 
            transform: "translateX(0) scaleX(1)",
            transformOrigin: "left",
            backgroundImage: "linear-gradient(to right, hsl(0, 0%, 100%, 0.65), hsl(0, 0%, 0%) 40%, transparent)"
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s ease-out",
        "accordion-up": "accordion-up 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "wiggle": "wiggle 0.8s ease-in-out",
        "line-bounce": "line-bounce 1.2s ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
