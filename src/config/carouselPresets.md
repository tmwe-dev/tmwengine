# Radio Carousel 3D - Visual Presets Documentation

## 🎭 TRAPEZOID PERSPECTIVE EFFECT

**Salvato il**: 26 ottobre 2025  
**File**: `carouselPresets.ts` → `TRAPEZOID_CAROUSEL`

### Visual Effect

```
         CAMERA VIEW
┌────────────────────────────┐
│                            │
│    ╔══════════════════╗    │ ← Top (più lontano, più piccolo)
│    ║                  ║    │
│    ║   CARD INCLINATA ║    │
│   ║                    ║   │
│   ║      TRAPEZIO      ║   │
│  ║                      ║  │
│  ╚════════════════════════╝ │ ← Bottom (più vicino, più grande)
│                            │
└────────────────────────────┘

Side View (posizioni 3D):
                Camera (0, 0, 13.5)
                    │
                    ↓ lookAt(0, 1.5, 0)
        ┌───────────┴───────────┐
        │                       │
   Y=1.5├─────┐ Mesh Position   │
        │     │                 │
        │     ↓                 │
   Y=0  •─────┘ Mesh lookAt     │ ← Crea inclinazione
        │                       │
        └───────────────────────┘
```

### Technical Parameters

| Parameter | Value | Effect |
|-----------|-------|--------|
| `mesh.position.y` | `1.5` | Card posizionate in alto |
| `mesh.lookAt(y)` | `0` | Card guardano verso il centro basso |
| `camera.lookAt(y)` | `1.5` | Camera guarda le card |
| **Inclination angle** | **~15-20°** | Differenza tra Y position e lookAt |

### Key Formula

```typescript
// Inclinazione trapezio
const tiltAngle = Math.atan((meshPosition.y - meshLookAt.y) / radius);
// Con Y=1.5 e lookAt=0: tilt ≈ 10.8° (su radius=7.8)
```

### Use Cases

✅ **Ideale per**:
- Effetti cinematografici
- Dashboard futuristiche
- Presentazioni dinamiche
- Card "galleggianti" in prospettiva

❌ **Evitare se**:
- Serve leggibilità massima del testo
- Design minimalista/flat
- Accessibilità prioritaria

---

## 📐 DEFAULT FLAT EFFECT

**File**: `carouselPresets.ts` → `DEFAULT_FLAT_CAROUSEL`

### Visual Effect

```
         CAMERA VIEW
┌────────────────────────────┐
│                            │
│  ╔══════════════════════╗  │
│  ║                      ║  │
│  ║   CARD VERTICALE     ║  │
│  ║   (NESSUNA INCLINAZ) ║  │
│  ║                      ║  │
│  ╚══════════════════════╝  │
│                            │
└────────────────────────────┘

Side View:
                Camera (0, 0, 13.5)
                    │
                    ↓ lookAt(0, 1.5, 0)
        ┌───────────┴───────────┐
        │                       │
   Y=1.5├─────┐ Mesh Position   │
        │     │                 │
        │     ↓                 │
   Y=1.5•─────┘ Mesh lookAt     │ ← Stessa altezza = verticale
        │                       │
        └───────────────────────┘
```

### Key Difference

```typescript
// TRAPEZOID: mesh.lookAt(0, 0, 0)     → Inclinato
// DEFAULT:   mesh.lookAt(0, 1.5, 0)   → Verticale
```

---

## 🔄 Come Switchare tra Preset

### Opzione 1: Modificare `RadioCarousel3D.tsx`

```typescript
import { CAROUSEL_PRESETS, applyPreset } from '@/config/carouselPresets';

// In cima al componente
const preset = applyPreset(CAROUSEL_PRESETS.TRAPEZOID); // o .DEFAULT

// Usare preset.camera, preset.carousel, etc.
```

### Opzione 2: Props al componente

```typescript
<RadioCarousel3D
  messages={messages}
  activeMessageId={activeId}
  preset="trapezoid" // o "default"
/>
```

---

## 📊 Comparison Table

| Aspect | TRAPEZOID | DEFAULT |
|--------|-----------|---------|
| Mesh Y | 1.5 | 1.5 |
| Mesh lookAt Y | **0** | **1.5** |
| Tilt angle | ~10-15° | 0° |
| Visual effect | Prospettico | Piatto |
| Text readability | 8/10 | 10/10 |
| Cinematic feel | 10/10 | 6/10 |
| Accessibility | 7/10 | 10/10 |

---

## 💾 Backup & Restore

### Backup attuale (Trapezoid)
```bash
# File salvato in: src/config/carouselPresets.ts
# Preset: TRAPEZOID_CAROUSEL
# Data: 2025-10-26
```

### Restore in futuro
```typescript
import { TRAPEZOID_CAROUSEL } from '@/config/carouselPresets';

// Applica tutti i parametri salvati
const { camera, carousel, geometry } = TRAPEZOID_CAROUSEL;
```

---

## 🎯 Quick Reference

### Per applicare effetto trapezio:
```typescript
mesh.position.y = 1.5;        // Alto
mesh.lookAt(0, 0, 0);         // Guarda in basso → TRAPEZIO
```

### Per card verticali normali:
```typescript
mesh.position.y = 1.5;        // Alto
mesh.lookAt(0, 1.5, 0);       // Guarda dritto → PIATTO
```

---

**Screenshot di riferimento**: `Screenshot_2025-10-26_alle_11.05.01.png`
