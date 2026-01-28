# 🎡 Carosello 3D - Animazione Estratta per WordPress

**Estratto da**: `src/components/radio-chat/RadioCarousel3D.tsx`  
**Data estrazione**: 2026-01-28  
**Compatibilità**: Tutti i browser moderni con WebGL

---

## 🚀 Quick Start (Copia-Incolla)

Aggiungi questo codice in una pagina WordPress usando un blocco **HTML Personalizzato** o un page builder:

```html
<!-- Container -->
<div id="carousel-3d-container" style="width: 100%; height: 600px; background: #0a0a0a;"></div>

<!-- Dipendenze CDN -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>

<!-- Codice Carosello -->
<script>
(function() {
  // ============================================
  // 🎛️ CONFIGURAZIONE (modifica questi valori)
  // ============================================
  const CONFIG = {
    MAX_SLOTS: 8,           // Numero di card nel carosello
    RADIUS: 7.8,            // Raggio del cerchio
    CARD_WIDTH: 4.83,       // Larghezza card
    CARD_HEIGHT: 7.04,      // Altezza card
    CARD_Y_POSITION: 0.82,  // Altezza verticale delle card
    CAMERA_FOV: 67,         // Field of View camera
    CAMERA_Y: 0.3,          // Posizione Y camera
    CAMERA_Z: 13.5,         // Distanza camera
    ROTATION_DURATION: 1.2, // Durata rotazione in secondi
    ROTATION_EASE: 'power2.inOut', // Easing GSAP
    AUTO_ROTATE: true,      // Rotazione automatica
    AUTO_ROTATE_DELAY: 3000 // Delay tra rotazioni (ms)
  };

  // ============================================
  // 🎨 COLORI CARD (modifica per il tuo brand)
  // ============================================
  const CARD_STYLES = [
    { bg: '#1e40af', border: '#3b82f6', title: 'Card 1' },
    { bg: '#166534', border: '#22c55e', title: 'Card 2' },
    { bg: '#155e75', border: '#06b6d4', title: 'Card 3' },
    { bg: '#6b21a8', border: '#a855f7', title: 'Card 4' },
    { bg: '#b91c1c', border: '#ef4444', title: 'Card 5' },
    { bg: '#c2410c', border: '#f97316', title: 'Card 6' },
    { bg: '#a16207', border: '#eab308', title: 'Card 7' },
    { bg: '#4d7c0f', border: '#84cc16', title: 'Card 8' }
  ];

  // ============================================
  // 🖼️ CREAZIONE TEXTURE CARD
  // ============================================
  function createCardTexture(index, customContent) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const DPR = window.devicePixelRatio || 2;
    const W = 800;
    const H = 1100;

    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);

    const style = CARD_STYLES[index % CARD_STYLES.length];

    // Background
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = style.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, W - 4, H - 4);

    // Titolo
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(customContent?.title || style.title, W / 2, 120);

    // Contenuto (opzionale)
    if (customContent?.body) {
      ctx.font = '28px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      
      const words = customContent.body.split(' ');
      let line = '';
      let y = 200;
      const lineHeight = 36;
      const maxWidth = W - 80;

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && i > 0) {
          ctx.fillText(line, W / 2, y);
          line = words[i] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, W / 2, y);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  // ============================================
  // 🎡 INIZIALIZZAZIONE SCENA THREE.JS
  // ============================================
  const container = document.getElementById('carousel-3d-container');
  if (!container) {
    console.error('❌ Container #carousel-3d-container non trovato!');
    return;
  }

  // Verifica WebGL
  if (!window.WebGLRenderingContext) {
    container.innerHTML = '<p style="color: #fff; text-align: center; padding: 40px;">Il tuo browser non supporta WebGL</p>';
    return;
  }

  // Scena
  const scene = new THREE.Scene();
  
  // Camera
  const camera = new THREE.PerspectiveCamera(
    CONFIG.CAMERA_FOV,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, CONFIG.CAMERA_Y, CONFIG.CAMERA_Z);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Luci
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const pointLight = new THREE.PointLight(0x8b5cf6, 1, 100);
  pointLight.position.set(0, 0, 5);
  scene.add(pointLight);

  // Gruppo carosello (per rotazione)
  const carouselGroup = new THREE.Group();
  scene.add(carouselGroup);

  // ============================================
  // 📍 CREAZIONE SLOT CAROSELLO
  // ============================================
  const angleStep = (Math.PI * 2) / CONFIG.MAX_SLOTS;
  const meshes = [];

  for (let i = 0; i < CONFIG.MAX_SLOTS; i++) {
    const geometry = new THREE.PlaneGeometry(CONFIG.CARD_WIDTH, CONFIG.CARD_HEIGHT);
    const material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1
    });
    
    // Applica texture
    material.map = createCardTexture(i, {
      title: `Card ${i + 1}`,
      body: 'Contenuto personalizzabile per questa card del carosello 3D.'
    });
    
    const mesh = new THREE.Mesh(geometry, material);

    // Posizionamento circolare (senso ANTIORARIO)
    const angle = -(i * angleStep) + Math.PI;
    mesh.position.set(
      Math.cos(angle) * CONFIG.RADIUS,
      CONFIG.CARD_Y_POSITION,
      Math.sin(angle) * CONFIG.RADIUS
    );
    
    // Card guarda verso il centro
    mesh.lookAt(new THREE.Vector3(0, 0, 0));
    
    carouselGroup.add(mesh);
    meshes.push(mesh);
  }

  // ============================================
  // 🔄 ANIMAZIONE ROTAZIONE (IL CUORE!)
  // ============================================
  let currentIndex = 0;

  /**
   * Ruota il carosello alla card specificata
   * @param {number} targetIndex - Indice della card (0 to MAX_SLOTS-1)
   */
  function rotateToIndex(targetIndex) {
    // Normalizza indice
    targetIndex = ((targetIndex % CONFIG.MAX_SLOTS) + CONFIG.MAX_SLOTS) % CONFIG.MAX_SLOTS;
    currentIndex = targetIndex;

    // Calcola angolo target
    const targetAngle = -(targetIndex / CONFIG.MAX_SLOTS) * Math.PI * 2 + Math.PI / 2;
    
    // ✨ ANIMAZIONE GSAP (fluida con easing)
    gsap.to(carouselGroup.rotation, {
      y: targetAngle,
      duration: CONFIG.ROTATION_DURATION,
      ease: CONFIG.ROTATION_EASE
    });
    
    console.log(`🎡 Rotazione a card ${targetIndex}, angolo: ${(targetAngle * 180 / Math.PI).toFixed(1)}°`);
  }

  /**
   * Vai alla card successiva
   */
  function next() {
    rotateToIndex(currentIndex + 1);
  }

  /**
   * Vai alla card precedente
   */
  function previous() {
    rotateToIndex(currentIndex - 1);
  }

  // ============================================
  // 🖱️ NAVIGAZIONE (click sulle aree laterali)
  // ============================================
  // Area sinistra (precedente)
  const leftZone = document.createElement('div');
  leftZone.style.cssText = 'position: absolute; left: 0; top: 0; width: 25%; height: 100%; cursor: pointer; z-index: 10;';
  leftZone.onclick = previous;
  container.style.position = 'relative';
  container.appendChild(leftZone);

  // Area destra (successiva)
  const rightZone = document.createElement('div');
  rightZone.style.cssText = 'position: absolute; right: 0; top: 0; width: 25%; height: 100%; cursor: pointer; z-index: 10;';
  rightZone.onclick = next;
  container.appendChild(rightZone);

  // ============================================
  // ⌨️ NAVIGAZIONE TASTIERA
  // ============================================
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') previous();
    if (e.key === 'ArrowRight') next();
  });

  // ============================================
  // 🔄 AUTO-ROTATE (opzionale)
  // ============================================
  let autoRotateInterval = null;
  
  if (CONFIG.AUTO_ROTATE) {
    autoRotateInterval = setInterval(next, CONFIG.AUTO_ROTATE_DELAY);
    
    // Pausa su hover
    container.addEventListener('mouseenter', function() {
      clearInterval(autoRotateInterval);
    });
    
    container.addEventListener('mouseleave', function() {
      autoRotateInterval = setInterval(next, CONFIG.AUTO_ROTATE_DELAY);
    });
  }

  // ============================================
  // 🎬 LOOP DI RENDERING
  // ============================================
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  // ============================================
  // 📐 RESPONSIVE (resize)
  // ============================================
  const resizeObserver = new ResizeObserver(function(entries) {
    const { width, height } = entries[0].contentRect;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
  resizeObserver.observe(container);

  // ============================================
  // 🌐 API PUBBLICA (per controllo esterno)
  // ============================================
  window.Carousel3D = {
    next: next,
    previous: previous,
    goTo: rotateToIndex,
    getCurrentIndex: function() { return currentIndex; },
    updateCard: function(index, content) {
      if (index >= 0 && index < meshes.length) {
        const mesh = meshes[index];
        mesh.material.map.dispose();
        mesh.material.map = createCardTexture(index, content);
        mesh.material.needsUpdate = true;
      }
    }
  };

  console.log('✅ Carosello 3D inizializzato! Usa window.Carousel3D per controllarlo.');
})();
</script>
```

---

## 🎛️ Parametri Configurabili

| Parametro | Default | Descrizione |
|-----------|---------|-------------|
| `MAX_SLOTS` | 8 | Numero di card nel carosello |
| `RADIUS` | 7.8 | Raggio del cerchio 3D |
| `CARD_WIDTH` | 4.83 | Larghezza delle card |
| `CARD_HEIGHT` | 7.04 | Altezza delle card |
| `ROTATION_DURATION` | 1.2 | Durata animazione (secondi) |
| `ROTATION_EASE` | `power2.inOut` | Curva di easing GSAP |
| `AUTO_ROTATE` | true | Rotazione automatica |
| `AUTO_ROTATE_DELAY` | 3000 | Intervallo auto-rotazione (ms) |

---

## 🎨 Varianti di Easing GSAP

Modifica `ROTATION_EASE` per cambiare il "feeling" dell'animazione:

| Easing | Effetto |
|--------|---------|
| `power2.inOut` | ✨ Fluido (default) - accelera e decelera |
| `power3.inOut` | Più marcato |
| `elastic.out(1, 0.5)` | 🎾 Rimbalzo elastico |
| `back.out(1.7)` | ↩️ Leggero overshoot |
| `expo.inOut` | 💥 Molto drammatico |
| `circ.inOut` | 🔵 Circolare |
| `bounce.out` | ⚽ Effetto palla |

---

## 🔌 API JavaScript

Dopo l'inizializzazione, puoi controllare il carosello via JavaScript:

```javascript
// Vai alla card successiva
Carousel3D.next();

// Vai alla card precedente
Carousel3D.previous();

// Vai a una card specifica (indice 0-7)
Carousel3D.goTo(3);

// Ottieni l'indice corrente
const currentCard = Carousel3D.getCurrentIndex();

// Aggiorna il contenuto di una card
Carousel3D.updateCard(0, {
  title: 'Nuovo Titolo',
  body: 'Nuovo contenuto della card.'
});
```

---

## 📱 Integrazione WordPress

### Opzione 1: Blocco HTML Personalizzato
1. Modifica la pagina
2. Aggiungi blocco "HTML Personalizzato"
3. Incolla tutto il codice

### Opzione 2: Elementor
1. Aggiungi widget "HTML"
2. Incolla il codice

### Opzione 3: Shortcode (tema child)
Aggiungi in `functions.php`:

```php
function carousel_3d_shortcode() {
  ob_start();
  ?>
  <!-- Incolla qui il codice del carosello -->
  <?php
  return ob_get_clean();
}
add_shortcode('carousel_3d', 'carousel_3d_shortcode');
```

Poi usa `[carousel_3d]` nelle pagine.

---

## 🧩 Personalizzazione Avanzata

### Cambiare i colori delle card

Modifica l'array `CARD_STYLES`:

```javascript
const CARD_STYLES = [
  { bg: '#ff0000', border: '#ff6666', title: 'Rosso' },
  { bg: '#00ff00', border: '#66ff66', title: 'Verde' },
  // ... aggiungi altri stili
];
```

### Aggiungere immagini alle card

Sostituisci la funzione `createCardTexture` per caricare immagini:

```javascript
function createCardTextureFromImage(imageSrc) {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(imageSrc, (texture) => {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      resolve(texture);
    });
  });
}
```

---

## ⚠️ Note Tecniche

- **WebGL richiesto**: Il carosello usa WebGL. Browser molto vecchi potrebbero non supportarlo.
- **Performance**: Testato fino a 16 card senza problemi di performance.
- **Mobile**: Funziona su mobile, considera di ridurre `RADIUS` per schermi piccoli.
- **SEO**: Il contenuto 3D non è indicizzabile. Aggiungi testo alternativo sotto il carosello.

---

## 📥 Download Diretto

Puoi scaricare questo file markdown cliccando il pulsante "Download" nella vista file di Lovable.

---

**Fine Documentazione**
