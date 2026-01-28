

# Estrazione Animazione Carosello 3D per WordPress

## Panoramica

Estrarrò il movimento fluido del carosello 3D da `RadioCarousel3D.tsx` in un documento standalone pronto per WordPress. L'animazione usa:

- **Three.js** per la scena 3D
- **GSAP** per la rotazione fluida con easing `power2.inOut`

## Cosa verrà incluso nel documento

### 1. Dipendenze CDN (per WordPress)
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
```

### 2. Struttura HTML
```html
<div id="carousel-container" style="width: 100%; height: 600px;"></div>
```

### 3. Codice JavaScript Estratto

**Configurazione del carosello:**
- `MAX_SLOTS = 8` → numero di elementi nel cerchio
- `radius = 7.8` → raggio del carosello
- `angleStep = (Math.PI * 2) / MAX_SLOTS` → angolo tra ogni elemento

**Animazione della rotazione (il cuore del movimento):**
```javascript
function rotateToIndex(group, targetIndex, totalSlots) {
  const targetAngle = -(targetIndex / totalSlots) * Math.PI * 2 + Math.PI / 2;
  gsap.to(group.rotation, {
    y: targetAngle,
    duration: 1.2,           // Durata in secondi
    ease: 'power2.inOut'     // Easing fluido (accelera e decelera)
  });
}
```

**Parametri personalizzabili:**
| Parametro | Valore attuale | Descrizione |
|-----------|---------------|-------------|
| `duration` | 1.2s | Velocità della rotazione |
| `ease` | power2.inOut | Curva di accelerazione |
| `radius` | 7.8 | Raggio del cerchio |
| `MAX_SLOTS` | 8 | Numero di card |

### 4. Varianti di Easing GSAP

Per modificare il "feeling" dell'animazione:
- `power2.inOut` → Fluido (attuale)
- `elastic.out(1, 0.5)` → Effetto rimbalzo
- `back.out(1.7)` → Overshoot leggero
- `expo.inOut` → Molto drammatico

## File da creare

| File | Descrizione |
|------|-------------|
| `docs/CAROUSEL_3D_ANIMATION_EXTRACT.md` | Documentazione completa con codice pronto per WordPress |

## Contenuto del documento

Il documento includerà:

1. **Quick Start** - copia-incolla per WordPress
2. **Codice completo** - JavaScript standalone
3. **Istruzioni di integrazione** - come aggiungere a WordPress (shortcode, page builder, custom HTML)
4. **Parametri configurabili** - tabella con tutte le variabili
5. **Esempi di navigazione** - click, autoplay, swipe

## Note tecniche

- Il codice sarà **vanilla JavaScript** (no React, no TypeScript)
- Compatibile con tutti i temi WordPress
- Include fallback per browser senza WebGL
- Responsive con ResizeObserver

