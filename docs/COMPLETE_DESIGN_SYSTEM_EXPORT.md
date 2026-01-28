# 🎨 CRM Pro Design System - Export Completo

> **Versione:** 2.0  
> **Data:** Gennaio 2026  
> **Compatibilità:** React 18+, WordPress 6+, HTML5

Questo documento contiene **tutto il necessario** per riutilizzare il design system TMW Engine in qualsiasi progetto.

---

## 📚 Indice

1. [Quick Start](#-quick-start)
2. [Token CSS Completi](#-token-css-completi)
3. [Configurazione Tailwind](#-configurazione-tailwind)
4. [Utility Functions](#-utility-functions)
5. [Carosello 3D Standalone](#-carosello-3d-standalone)
6. [Componenti Design System](#-componenti-design-system)
7. [Integrazione per Piattaforme](#-integrazione-per-piattaforme)
8. [Checklist Export](#-checklist-export)

---

## 🚀 Quick Start

### 5 Minuti per Iniziare

#### Opzione A: Solo CSS (WordPress/HTML)
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css">
<style>
  :root {
    --primary: 270 70% 60%;
    --background: 240 15% 8%;
    --foreground: 0 0% 98%;
  }
</style>
```

#### Opzione B: React + Tailwind
```bash
npm install tailwindcss clsx tailwind-merge class-variance-authority lucide-react
```

#### Opzione C: Con Carosello 3D
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<!-- Vedi Sezione 5 per il codice completo -->
```

---

## 🎨 Token CSS Completi

### Variabili Base (Copia in `index.css` o `<style>`)

```css
@layer base {
  :root {
    /* ═══════════════════════════════════════════════════════════════
       SUPERFICI & SFONDI
       ═══════════════════════════════════════════════════════════════ */
    --background: 240 15% 8%;
    --foreground: 0 0% 98%;
    --surface: 240 12% 12%;
    --surface-secondary: 240 10% 16%;

    /* ═══════════════════════════════════════════════════════════════
       COLORI SEMANTICI
       ═══════════════════════════════════════════════════════════════ */
    
    /* Primary - Lilla/Viola */
    --primary: 270 70% 60%;
    --primary-foreground: 0 0% 100%;
    --primary-hover: 270 75% 55%;
    --primary-muted: 270 40% 25%;

    /* Secondary - Cyan/Teal */
    --secondary: 180 60% 45%;
    --secondary-foreground: 0 0% 100%;
    --secondary-hover: 180 65% 40%;

    /* Success - Verde */
    --success: 142 70% 45%;
    --success-foreground: 0 0% 100%;
    --success-muted: 142 40% 20%;

    /* Warning - Ambra */
    --warning: 38 95% 55%;
    --warning-foreground: 0 0% 0%;
    --warning-muted: 38 50% 25%;

    /* Destructive - Rosso */
    --destructive: 0 75% 55%;
    --destructive-foreground: 0 0% 100%;
    --destructive-muted: 0 40% 25%;

    /* ═══════════════════════════════════════════════════════════════
       INTERFACCIA UI
       ═══════════════════════════════════════════════════════════════ */
    --muted: 240 10% 20%;
    --muted-foreground: 240 5% 65%;

    --accent: 270 50% 25%;
    --accent-foreground: 270 70% 75%;

    --popover: 240 12% 10%;
    --popover-foreground: 0 0% 98%;

    --card: 240 12% 10%;
    --card-foreground: 0 0% 98%;
    --card-border: 240 10% 20%;
    --card-transparent: 240 12% 10% / 0.8;

    /* ═══════════════════════════════════════════════════════════════
       BORDI & INPUT
       ═══════════════════════════════════════════════════════════════ */
    --border: 240 10% 25%;
    --input: 240 10% 18%;
    --ring: 270 70% 60%;

    /* ═══════════════════════════════════════════════════════════════
       SIDEBAR
       ═══════════════════════════════════════════════════════════════ */
    --sidebar-background: 240 15% 6%;
    --sidebar-foreground: 0 0% 90%;
    --sidebar-primary: 270 70% 60%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 270 50% 20%;
    --sidebar-accent-foreground: 270 70% 80%;
    --sidebar-border: 240 10% 15%;
    --sidebar-ring: 270 70% 60%;

    /* ═══════════════════════════════════════════════════════════════
       SPAZIATURE
       ═══════════════════════════════════════════════════════════════ */
    --spacing-xs: 0.25rem;   /* 4px */
    --spacing-sm: 0.5rem;    /* 8px */
    --spacing-md: 1rem;      /* 16px */
    --spacing-lg: 1.5rem;    /* 24px */
    --spacing-xl: 2rem;      /* 32px */
    --spacing-2xl: 3rem;     /* 48px */

    /* ═══════════════════════════════════════════════════════════════
       GEOMETRIA
       ═══════════════════════════════════════════════════════════════ */
    --radius: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;

    /* ═══════════════════════════════════════════════════════════════
       TIPOGRAFIA
       ═══════════════════════════════════════════════════════════════ */
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;
    --font-size-3xl: 1.875rem;
    --font-size-4xl: 2.25rem;

    --font-weight-normal: 400;
    --font-weight-medium: 500;
    --font-weight-semibold: 600;
    --font-weight-bold: 700;

    --line-height-tight: 1.25;
    --line-height-normal: 1.5;
    --line-height-relaxed: 1.75;

    /* ═══════════════════════════════════════════════════════════════
       OMBRE
       ═══════════════════════════════════════════════════════════════ */
    --shadow-sm: 0 1px 2px 0 hsl(0 0% 0% / 0.3);
    --shadow-md: 0 4px 6px -1px hsl(0 0% 0% / 0.4);
    --shadow-lg: 0 10px 15px -3px hsl(0 0% 0% / 0.5);
    --shadow-glow: 0 0 30px hsl(270 70% 60% / 0.4);

    /* ═══════════════════════════════════════════════════════════════
       TRANSIZIONI
       ═══════════════════════════════════════════════════════════════ */
    --transition-fast: 150ms;
    --transition-normal: 300ms;
    --transition-slow: 500ms;
  }
}
```

### Temi Colore Alternativi

```css
/* 🌊 Tema Ocean - Blu/Cyan */
.theme-ocean {
  --primary: 200 80% 55%;
  --primary-hover: 200 85% 50%;
  --primary-muted: 200 40% 25%;
  --accent: 200 50% 25%;
  --ring: 200 80% 55%;
}

/* 🌅 Tema Sunset - Arancione/Rosa */
.theme-sunset {
  --primary: 25 90% 55%;
  --primary-hover: 25 95% 50%;
  --primary-muted: 25 50% 25%;
  --accent: 25 50% 25%;
  --ring: 25 90% 55%;
}

/* 🌲 Tema Forest - Verde/Smeraldo */
.theme-forest {
  --primary: 150 70% 45%;
  --primary-hover: 150 75% 40%;
  --primary-muted: 150 40% 20%;
  --accent: 150 50% 20%;
  --ring: 150 70% 45%;
}

/* ☁️ Tema Sky - Azzurro chiaro */
.theme-sky {
  --primary: 210 90% 60%;
  --primary-hover: 210 95% 55%;
  --primary-muted: 210 50% 30%;
  --accent: 210 50% 25%;
  --ring: 210 90% 60%;
}
```

---

## ⚙️ Configurazione Tailwind

### File `tailwind.config.ts` Completo

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
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
        "heartbeat": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.2)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s ease-out",
        "accordion-up": "accordion-up 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "wiggle": "wiggle 0.8s ease-in-out",
        "heartbeat": "heartbeat 1s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## 🛠️ Utility Functions

### File `utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classi CSS con supporto per condizionali e merge Tailwind
 * @example cn("base-class", isActive && "active-class", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Dipendenze NPM

```bash
npm install clsx tailwind-merge
```

---

## 🎠 Carosello 3D Standalone

### Codice Completo per WordPress/HTML

```html
<!-- 
  ═══════════════════════════════════════════════════════════════════════
  CAROSELLO 3D ANIMATO - TMW Engine Design System
  ═══════════════════════════════════════════════════════════════════════
  
  Dipendenze:
  - GSAP 3.12+ (CDN incluso sotto)
  
  Utilizzo:
  1. Copia questo blocco HTML nella tua pagina
  2. Personalizza le immagini nell'array SLIDES
  3. Modifica i parametri in CONFIG se necessario
-->

<!-- GSAP CDN -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>

<!-- Container del Carosello -->
<div id="carousel3d-container" style="
  width: 100%;
  height: 500px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, hsl(240 15% 8%), hsl(240 12% 12%));
  border-radius: 16px;
">
  <div id="carousel3d-track" style="
    position: absolute;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    perspective: 1200px;
  "></div>
  
  <!-- Controlli -->
  <button id="carousel3d-prev" style="
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    background: hsl(270 70% 60% / 0.8);
    color: white;
    border: none;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 24px;
    z-index: 10;
  ">‹</button>
  
  <button id="carousel3d-next" style="
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    background: hsl(270 70% 60% / 0.8);
    color: white;
    border: none;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 24px;
    z-index: 10;
  ">›</button>
  
  <!-- Indicatori -->
  <div id="carousel3d-dots" style="
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    z-index: 10;
  "></div>
</div>

<script>
(function() {
  'use strict';
  
  // ═══════════════════════════════════════════════════════════════════
  // CONFIGURAZIONE - Modifica questi valori
  // ═══════════════════════════════════════════════════════════════════
  
  const CONFIG = {
    // Dimensioni slide
    slideWidth: 320,
    slideHeight: 400,
    
    // Animazione
    rotationSpeed: 0.8,        // Secondi per rotazione
    autoRotate: true,          // Rotazione automatica
    autoRotateDelay: 4000,     // Millisecondi tra rotazioni
    
    // Effetti 3D
    perspective: 1200,
    radius: 400,               // Raggio del cerchio
    tiltAngle: 5,              // Inclinazione prospettica
    
    // Stili
    slideBackground: 'hsl(240 12% 15%)',
    slideBorder: '1px solid hsl(240 10% 25%)',
    slideRadius: '12px',
    shadowColor: 'hsl(0 0% 0% / 0.4)',
    
    // Focus
    focusScale: 1.1,
    focusOpacity: 1,
    unfocusOpacity: 0.6,
  };
  
  // ═══════════════════════════════════════════════════════════════════
  // SLIDES - Aggiungi le tue immagini qui
  // ═══════════════════════════════════════════════════════════════════
  
  const SLIDES = [
    {
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
      title: 'Tecnologia',
      description: 'Innovazione digitale'
    },
    {
      image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400',
      title: 'Data',
      description: 'Analisi avanzata'
    },
    {
      image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400',
      title: 'Security',
      description: 'Protezione totale'
    },
    {
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400',
      title: 'Cloud',
      description: 'Scalabilità infinita'
    },
    {
      image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400',
      title: 'Network',
      description: 'Connessione globale'
    }
  ];
  
  // ═══════════════════════════════════════════════════════════════════
  // LOGICA CAROSELLO - Non modificare sotto questa linea
  // ═══════════════════════════════════════════════════════════════════
  
  class Carousel3D {
    constructor() {
      this.container = document.getElementById('carousel3d-container');
      this.track = document.getElementById('carousel3d-track');
      this.dotsContainer = document.getElementById('carousel3d-dots');
      this.prevBtn = document.getElementById('carousel3d-prev');
      this.nextBtn = document.getElementById('carousel3d-next');
      
      this.currentIndex = 0;
      this.slideCount = SLIDES.length;
      this.angleStep = 360 / this.slideCount;
      this.autoRotateTimer = null;
      
      this.init();
    }
    
    init() {
      this.createSlides();
      this.createDots();
      this.bindEvents();
      this.updateCarousel(false);
      
      if (CONFIG.autoRotate) {
        this.startAutoRotate();
      }
    }
    
    createSlides() {
      SLIDES.forEach((slide, index) => {
        const el = document.createElement('div');
        el.className = 'carousel3d-slide';
        el.style.cssText = `
          position: absolute;
          width: ${CONFIG.slideWidth}px;
          height: ${CONFIG.slideHeight}px;
          left: 50%;
          top: 50%;
          margin-left: -${CONFIG.slideWidth / 2}px;
          margin-top: -${CONFIG.slideHeight / 2}px;
          background: ${CONFIG.slideBackground};
          border: ${CONFIG.slideBorder};
          border-radius: ${CONFIG.slideRadius};
          overflow: hidden;
          cursor: pointer;
          transition: opacity 0.3s ease;
        `;
        
        el.innerHTML = `
          <img src="${slide.image}" alt="${slide.title}" style="
            width: 100%;
            height: 70%;
            object-fit: cover;
          "/>
          <div style="
            padding: 16px;
            text-align: center;
          ">
            <h3 style="
              margin: 0 0 8px;
              font-size: 18px;
              font-weight: 600;
              color: hsl(0 0% 98%);
            ">${slide.title}</h3>
            <p style="
              margin: 0;
              font-size: 14px;
              color: hsl(240 5% 65%);
            ">${slide.description}</p>
          </div>
        `;
        
        el.addEventListener('click', () => this.goTo(index));
        this.track.appendChild(el);
      });
      
      this.slides = this.track.querySelectorAll('.carousel3d-slide');
    }
    
    createDots() {
      SLIDES.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.style.cssText = `
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: none;
          background: hsl(0 0% 50%);
          cursor: pointer;
          transition: all 0.3s ease;
        `;
        dot.addEventListener('click', () => this.goTo(index));
        this.dotsContainer.appendChild(dot);
      });
      
      this.dots = this.dotsContainer.querySelectorAll('button');
    }
    
    bindEvents() {
      this.prevBtn.addEventListener('click', () => this.prev());
      this.nextBtn.addEventListener('click', () => this.next());
      
      // Pause on hover
      this.container.addEventListener('mouseenter', () => this.stopAutoRotate());
      this.container.addEventListener('mouseleave', () => {
        if (CONFIG.autoRotate) this.startAutoRotate();
      });
      
      // Touch support
      let touchStartX = 0;
      this.container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        this.stopAutoRotate();
      });
      
      this.container.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > 50) {
          diff > 0 ? this.next() : this.prev();
        }
        
        if (CONFIG.autoRotate) this.startAutoRotate();
      });
    }
    
    updateCarousel(animate = true) {
      const duration = animate ? CONFIG.rotationSpeed : 0;
      
      this.slides.forEach((slide, index) => {
        const angle = (index - this.currentIndex) * this.angleStep;
        const radian = (angle * Math.PI) / 180;
        
        const x = Math.sin(radian) * CONFIG.radius;
        const z = Math.cos(radian) * CONFIG.radius - CONFIG.radius;
        const rotateY = -angle;
        
        const isFocused = index === this.currentIndex;
        const scale = isFocused ? CONFIG.focusScale : 1;
        const opacity = isFocused ? CONFIG.focusOpacity : CONFIG.unfocusOpacity;
        const zIndex = isFocused ? 10 : Math.round(z);
        
        gsap.to(slide, {
          duration,
          x,
          z,
          rotateY,
          scale,
          opacity,
          zIndex,
          ease: 'power2.out',
          boxShadow: isFocused 
            ? `0 25px 50px ${CONFIG.shadowColor}` 
            : `0 10px 30px ${CONFIG.shadowColor}`
        });
      });
      
      // Update dots
      this.dots.forEach((dot, index) => {
        const isActive = index === this.currentIndex;
        dot.style.background = isActive ? 'hsl(270 70% 60%)' : 'hsl(0 0% 50%)';
        dot.style.transform = isActive ? 'scale(1.3)' : 'scale(1)';
      });
    }
    
    next() {
      this.currentIndex = (this.currentIndex + 1) % this.slideCount;
      this.updateCarousel();
    }
    
    prev() {
      this.currentIndex = (this.currentIndex - 1 + this.slideCount) % this.slideCount;
      this.updateCarousel();
    }
    
    goTo(index) {
      if (index !== this.currentIndex) {
        this.currentIndex = index;
        this.updateCarousel();
      }
    }
    
    startAutoRotate() {
      this.stopAutoRotate();
      this.autoRotateTimer = setInterval(() => this.next(), CONFIG.autoRotateDelay);
    }
    
    stopAutoRotate() {
      if (this.autoRotateTimer) {
        clearInterval(this.autoRotateTimer);
        this.autoRotateTimer = null;
      }
    }
  }
  
  // Inizializza quando il DOM è pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new Carousel3D());
  } else {
    new Carousel3D();
  }
  
  // API pubblica per controllo esterno
  window.Carousel3D = {
    next: () => window._carousel3d?.next(),
    prev: () => window._carousel3d?.prev(),
    goTo: (i) => window._carousel3d?.goTo(i),
  };
})();
</script>
```

### Personalizzazione Rapida

```javascript
// Modifica CONFIG per:
CONFIG.autoRotate = false;      // Disabilita rotazione automatica
CONFIG.radius = 500;            // Aumenta/diminuisci raggio
CONFIG.slideWidth = 400;        // Slide più larghe
CONFIG.rotationSpeed = 0.5;     // Animazione più veloce

// Modifica SLIDES per le tue immagini:
const SLIDES = [
  { image: 'url1.jpg', title: 'Titolo 1', description: 'Desc 1' },
  { image: 'url2.jpg', title: 'Titolo 2', description: 'Desc 2' },
  // ...
];
```

---

## 📦 Componenti Design System

### Lista Componenti Disponibili

| Categoria | Componenti |
|-----------|------------|
| **Cards** | GlassCard, GradientCard, DataCard, StatCard |
| **Buttons** | ActionButton, IconButton, ButtonGroup |
| **Badges** | StatusBadge, CountBadge |
| **Data Display** | EmptyState, LoadingState, DynamicTabs, Timeline, StatsGrid, ProgressSteps |
| **Forms** | SearchInput |
| **Animations** | FadeIn, SlideIn, ScaleIn |
| **Menus** | DynamicDropdown, DynamicNavigation |
| **Layouts** | PageLayout, ContentWrapper, SplitLayout, HeroSection |
| **Effects** | GradientBackground, GradientText, HoverCard, LoadingOverlay, AnimatedBorder |
| **Feedback** | DynamicModal |
| **Navigation** | Breadcrumbs |

### Esempio di Utilizzo

```tsx
import { 
  GlassCard, 
  ActionButton, 
  StatusBadge,
  FadeIn 
} from '@/components/design-system';

function Dashboard() {
  return (
    <FadeIn>
      <GlassCard title="Statistiche">
        <StatusBadge status="success">Attivo</StatusBadge>
        <p className="text-muted-foreground">
          Sistema operativo
        </p>
        <ActionButton onClick={() => console.log('click')}>
          Dettagli
        </ActionButton>
      </GlassCard>
    </FadeIn>
  );
}
```

---

## 🔌 Integrazione per Piattaforme

### WordPress

#### Opzione 1: Blocco HTML Personalizzato

1. Vai in **Pagine → Aggiungi nuovo**
2. Aggiungi blocco **HTML personalizzato**
3. Incolla il codice del Carosello 3D
4. Pubblica

#### Opzione 2: Elementor

1. Trascina widget **HTML**
2. Incolla il codice completo
3. Salva

#### Opzione 3: Shortcode (per sviluppatori)

```php
// functions.php del tema
function tmw_carousel_shortcode() {
  ob_start();
  ?>
  <!-- Incolla qui il codice del carosello -->
  <?php
  return ob_get_clean();
}
add_shortcode('tmw_carousel', 'tmw_carousel_shortcode');

// Uso: [tmw_carousel]
```

### React/Vite

```bash
# 1. Copia le cartelle
cp -r src/components/design-system nuovo-progetto/src/components/
cp -r src/components/ui nuovo-progetto/src/components/
cp src/lib/utils.ts nuovo-progetto/src/lib/

# 2. Copia stili
# Aggiungi i token CSS in nuovo-progetto/src/index.css

# 3. Aggiorna tailwind.config.ts con i colori semantici

# 4. Installa dipendenze
cd nuovo-progetto
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-slot @radix-ui/react-tooltip
```

### HTML Puro

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TMW Design System</title>
  
  <!-- Tailwind CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Token CSS -->
  <style>
    :root {
      --primary: 270 70% 60%;
      --background: 240 15% 8%;
      --foreground: 0 0% 98%;
      --card: 240 12% 10%;
      --border: 240 10% 25%;
    }
    
    body {
      background: hsl(var(--background));
      color: hsl(var(--foreground));
    }
    
    .glass-card {
      background: hsl(var(--card) / 0.8);
      backdrop-filter: blur(12px);
      border: 1px solid hsl(var(--border));
      border-radius: 12px;
      padding: 24px;
    }
    
    .btn-primary {
      background: hsl(var(--primary));
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-weight: 500;
    }
    
    .btn-primary:hover {
      filter: brightness(1.1);
    }
  </style>
</head>
<body class="min-h-screen p-8">
  <div class="max-w-4xl mx-auto">
    <div class="glass-card">
      <h1 class="text-2xl font-bold mb-4">TMW Design System</h1>
      <p class="opacity-70 mb-6">Pronto per l'uso!</p>
      <button class="btn-primary">Inizia</button>
    </div>
  </div>
</body>
</html>
```

---

## ✅ Checklist Export

### Prima di Usare in Produzione

- [ ] **Token CSS** copiati in `index.css`
- [ ] **Tailwind config** aggiornato con colori semantici
- [ ] **Dipendenze** installate (`clsx`, `tailwind-merge`, `lucide-react`)
- [ ] **GSAP** caricato (se usi il carosello 3D)
- [ ] **Test** su mobile e tablet
- [ ] **Dark mode** funzionante (se applicabile)
- [ ] **Performance** verificata (Lighthouse > 90)
- [ ] **Accessibilità** verificata (contrasti, focus states)

### File da Copiare per React

```
📁 src/
├── 📁 components/
│   ├── 📁 design-system/    ← TUTTO
│   └── 📁 ui/               ← TUTTO
├── 📁 lib/
│   └── utils.ts
├── index.css                ← Token CSS
└── tailwind.config.ts       ← Config completa
```

### Dipendenze NPM

```json
{
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.462.0",
    "tailwind-merge": "^2.6.0",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-tooltip": "^1.2.7"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "tailwindcss-animate": "^1.0.7"
  }
}
```

---

## 📞 Supporto

Per domande o problemi:
- Consulta `src/components/design-system/README.md`
- Verifica i tipi in `src/components/design-system/index.ts`
- Controlla gli esempi in `docs/design-system-crm-pro.md`

---

> **Creato con ❤️ da TMW Engine**  
> Ultimo aggiornamento: Gennaio 2026
