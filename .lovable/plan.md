

# Creazione Documento Completo per Export Design System

## Obiettivo

Creare un unico file `docs/COMPLETE_DESIGN_SYSTEM_EXPORT.md` che contiene **tutto il necessario** per riutilizzare il design system in altri progetti (WordPress, React, HTML puro).

## Contenuto del Documento

### Sezione 1: Quick Start
- Istruzioni rapide per iniziare subito
- Dipendenze necessarie (CDN e npm)

### Sezione 2: Token CSS Completi
- Tutti i colori HSL (5 temi: Lilla, Ocean, Sunset, Forest, Sky)
- Spaziature (`--spacing-xs` a `--spacing-2xl`)
- Tipografia (font sizes, weights, line heights)
- Ombre e gradienti
- Border radius e geometria
- Transizioni e animazioni

### Sezione 3: Configurazione Tailwind
- File `tailwind.config.ts` completo
- Mapping colori semantici
- Keyframes e animazioni custom

### Sezione 4: Utility Functions
- Funzione `cn()` per merge classi CSS
- Dipendenze: `clsx`, `tailwind-merge`

### Sezione 5: Carosello 3D (Standalone)
- Codice completo JavaScript per WordPress
- Configurazione parametri
- API pubblica per controllo esterno

### Sezione 6: Componenti Design System
- Lista componenti disponibili
- Pattern di utilizzo
- Istruzioni per copiare da React

### Sezione 7: Integrazione per Piattaforme
- **WordPress**: Blocco HTML, Elementor, Shortcode
- **React/Vite**: Copia file e configura
- **HTML Puro**: CDN e snippet standalone

### Sezione 8: Checklist Export
- Lista controlli prima di usare in produzione

## Struttura File

| Sezione | Contenuto |
|---------|-----------|
| Header | Versione, data, compatibilità |
| Quick Start | 5 minuti per iniziare |
| CSS Variables | Tutti i token completi |
| Tailwind Config | Configurazione completa |
| Utils | Funzioni helper |
| Carousel 3D | Codice standalone |
| Componenti | Lista e pattern |
| Integrazioni | Guide per piattaforma |
| Checklist | Controlli finali |

## Note Tecniche

- Tutto il CSS usa **HSL** per facile personalizzazione
- Supporto **Dark Mode** incluso
- **5 temi colore** pre-configurati (Lilla, Ocean, Sunset, Forest, Sky)
- Animazioni GSAP per il carosello 3D
- Responsive con ResizeObserver

