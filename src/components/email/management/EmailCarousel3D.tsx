import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import type { EmailSenderGroup, SenderAnalysis } from '@/types/email-management';

interface EmailCarousel3DProps {
  categories: EmailSenderGroup[];
  assignedSenders: Map<string, SenderAnalysis[]>;
  activeCategoryId: string;
  zoom?: number;
}

// createTextTexture ora è definito DENTRO il componente come createTextTextureInternal per accedere ad assignedSenders via closure

const createEmptyTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  const DPR = window.devicePixelRatio || 2;
  const W = 800;
  const H = 1100;
  
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d')!;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  return texture;
};

export const EmailCarousel3D = ({
  categories, 
  assignedSenders,
  activeCategoryId,
  zoom = 1.0
}: EmailCarousel3DProps) => {
  const MAX_SLOTS = 8; // Numero massimo di pagine nel carosello
  
  // createTextTexture deve stare DENTRO il componente per accedere ad assignedSenders via closure
  const createTextTextureInternal = (category: EmailSenderGroup, renderer?: THREE.WebGLRenderer): THREE.CanvasTexture => {
    // Recupera i senders dalla Map tramite closure
    const senders = assignedSenders.get(category.id) || [];
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const DPR = window.devicePixelRatio || 2;

    // Misure reali ad alta risoluzione (PIÙ PICCOLE = PIÙ NITIDE)
    const W = 800;
    const H = 1100;

    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR); // Fondamentale per font nitidi

    // Configurazione colori per ogni tipo di categoria
    const gradientConfig = {
      work: { 
        from: 'rgba(59, 130, 246, 0.1)',    // blue-500/10
        to: 'rgba(37, 99, 235, 0.05)',      // blue-600/5
        border: 'rgba(59, 130, 246, 0.2)',  // blue-500/20
        title: '#1e40af',                    // blue-800
        badge: '#2563eb'                     // blue-600
      },
      personal: { 
        from: 'rgba(34, 197, 94, 0.1)',     // green-500/10
        to: 'rgba(22, 163, 74, 0.05)',      // green-600/5
        border: 'rgba(34, 197, 94, 0.2)',   // green-500/20
        title: '#166534',                    // green-800
        badge: '#16a34a'                     // green-600
      },
      marketing: { 
        from: 'rgba(6, 182, 212, 0.1)',     // cyan-500/10
        to: 'rgba(8, 145, 178, 0.05)',      // cyan-600/5
        border: 'rgba(6, 182, 212, 0.2)',   // cyan-500/20
        title: '#155e75',                    // cyan-800
        badge: '#0891b2'                     // cyan-600
      },
      spam: { 
        from: 'rgba(168, 85, 247, 0.1)',    // purple-500/10
        to: 'rgba(147, 51, 234, 0.05)',     // purple-600/5
        border: 'rgba(168, 85, 247, 0.2)',  // purple-500/20
        title: '#6b21a8',                    // purple-800
        badge: '#9333ea'                     // purple-600
      }
    };

    const categoryType = category.id as 'work' | 'personal' | 'marketing' | 'spam';
    const colors = gradientConfig[categoryType] || gradientConfig.work;

    // Background gradiente diagonale (come nelle card)
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, colors.from);
    gradient.addColorStop(1, colors.to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // Bordo colorato
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

    // Specchia orizzontalmente
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-W, 0);

    // Badge tipo categoria (top-right corner, ma specchiato diventa top-left)
    const badgeText = category.nome_gruppo.toUpperCase();
    const badgePadding = 12;
    const badgeHeight = 32;
    ctx.font = 'bold 18px sans-serif';
    const badgeWidth = ctx.measureText(badgeText).width + badgePadding * 2;

    // Badge background
    ctx.fillStyle = colors.badge;
    ctx.fillRect(20, 20, badgeWidth, badgeHeight);

    // Badge text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, 20 + badgeWidth/2, 20 + badgeHeight/2 + 6);

    // Titolo (nome categoria) con colore del brand
    ctx.fillStyle = colors.title;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(category.nome_gruppo, W / 2, 80);

    // Lista senders
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'left';

    const lineHeight = 32;
    let y = 140;
    ctx.fillText(`Mittenti: ${senders.length}`, 40, y);
    y += lineHeight + 10;

    // Mostra i primi 10 mittenti con nome in grassetto
    const maxSenders = 10;
    senders.slice(0, maxSenders).forEach((sender, i) => {
      // Nome società in grassetto (bianco)
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`• ${sender.companyName}`, 40, y);
      y += 28;
      
      // Email sottostante in corsivo (grigio chiaro)
      ctx.font = 'italic 18px sans-serif';
      ctx.fillStyle = '#cccccc';
      ctx.fillText(`  ${sender.email}`, 40, y);
      y += lineHeight + 8;
    });

    if (senders.length > maxSenders) {
      y += 10;
      ctx.fillStyle = '#cccccc';
      ctx.fillText(`... e altri ${senders.length - maxSenders}`, 40, y);
    }

    ctx.restore();

    // Texture con filtering ottimale
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    
    // Anisotropic filtering
    if (renderer) {
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    } else {
      texture.anisotropy = 4; // Fallback
    }
    
    console.log("🎨 createTextTexture() OPTIMIZED:", {
      category: category.nome_gruppo,
      canvasSize: `${canvas.width}x${canvas.height}`,
      logicalSize: `${W}x${H}`,
      DPR: DPR,
      anisotropy: texture.anisotropy
    });
    
    return texture;
  };
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const renderedCategoriesRef = useRef<Set<string>>(new Set());
  const hasInitializedSlotsRef = useRef(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
        const fov = window.innerWidth < 768 ? 62 : 67; // FOV leggermente ridotto per card più contenute
        const camera = new THREE.PerspectiveCamera(
          fov,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          1000
        );

    const renderer = new THREE.WebGLRenderer({
      alpha: true, 
      antialias: true 
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // ✅ CRITICO per HD
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0x8b5cf6, 1, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    const group = new THREE.Group();
    scene.add(group);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    groupRef.current = group;

    // ✅ CRITICO: Posizione iniziale camera (FISSA, non dipende da zoom)
    camera.position.set(0, 0.3, 13.5);

    // Animation loop
    let frameCount = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Debug: conta mesh visibili ogni 60 frame + dettagli opacity
      if (frameCount % 60 === 0 && groupRef.current) {
        groupRef.current.children.forEach((child, idx) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshBasicMaterial;
            console.log(`🚨 Mesh ${idx}: opacity=${mat.opacity}, visible=${child.visible}, map=${!!mat.map}, transparent=${mat.transparent}`);
          }
        });
        const visibleMeshes = groupRef.current.children.filter((child) => {
          if (!(child instanceof THREE.Mesh)) return false;
          const mat = child.material as THREE.MeshBasicMaterial;
          return mat.opacity > 0 && mat.visible !== false;
        });
        console.log(`🎬 Frame ${frameCount}: ${visibleMeshes.length}/${groupRef.current.children.length} mesh visibili`);
      }
      frameCount++;
      
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio); // ✅ Mantieni HD su resize
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  // ResizeObserver for container changes (sidebar open/close)
  useEffect(() => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
          rendererRef.current.setPixelRatio(window.devicePixelRatio); // ✅ Mantieni HD su resize
          
          console.log('📐 Canvas resized:', { width, height });
        }
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, []);

  // 📷 ZOOM FLUIDO con FOV (ultra-light, zero geometry recalc)
  useEffect(() => {
    if (!cameraRef.current) return;
    
    const baseFOV = 50; // Field of View base in gradi
    const newFOV = baseFOV / zoom; // zoom=1.3 → FOV=38° (più vicino), zoom=0.5 → FOV=100° (più lontano)
    
    cameraRef.current.fov = newFOV;
    cameraRef.current.updateProjectionMatrix();
    
    console.log(`📷 Zoom ${zoom.toFixed(2)} → FOV ${newFOV.toFixed(1)}° (fluido)`);
  }, [zoom]);

  // 1️⃣ INIZIALIZZAZIONE SLOT + POPOLAZIONE IMMEDIATA (come RadioCarousel3D)
  useEffect(() => {
    let attemptCount = 0;
    const MAX_ATTEMPTS = 10;

    const checkAndInit = () => {
      console.log(`🔍 Tentativo ${attemptCount + 1}/${MAX_ATTEMPTS} - groupRef:`, !!groupRef.current, 'hasInit:', hasInitializedSlotsRef.current);
      
      if (!groupRef.current) {
        attemptCount++;
        if (attemptCount < MAX_ATTEMPTS) {
          console.log('⏳ groupRef ancora null, ritento al prossimo frame...');
          requestAnimationFrame(checkAndInit);
        } else {
          console.error('❌ groupRef non pronto dopo 10 tentativi');
        }
        return;
      }

      console.log(`🎡 Creazione carosello con ${MAX_SLOTS} slot invisibili (geometria fissa)`);
      
      const group = groupRef.current;
      const radius = 7.8;
      const angleStep = (Math.PI * 2) / MAX_SLOTS;
      
      // Rimuovi vecchi slot se esistono
      meshesRef.current.forEach((mesh) => {
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          if (mat.map) mat.map.dispose();
          mat.dispose();
        }
        mesh.geometry.dispose();
      });
      meshesRef.current.clear();
      group.children.length = 0;
      
      for (let i = 0; i < MAX_SLOTS; i++) {
        const scaleFactor = Math.min(window.innerWidth / 1200, 2.0);
        const geometry = new THREE.PlaneGeometry(4.83 * scaleFactor, 7.04 * scaleFactor);
        const material = new THREE.MeshBasicMaterial({
          side: THREE.DoubleSide, 
          transparent: true,
          opacity: 0
        });
        const mesh = new THREE.Mesh(geometry, material);

        const angle = -(i * angleStep) + Math.PI;
      mesh.position.set(
        Math.cos(angle) * radius, 
        0.82,
        Math.sin(angle) * radius
      );
        mesh.lookAt(new THREE.Vector3(0, 0, 0));
        
        group.add(mesh);
        meshesRef.current.set(`slot_${i}`, mesh);
        console.log(`  📍 Slot ${i} creato a posizione:`, mesh.position.toArray());
      }
      
      hasInitializedSlotsRef.current = true;
      renderedCategoriesRef.current.clear();
      console.log(`✅ Carosello creato, meshesRef.size: ${meshesRef.current.size}`);
      console.log(`✅ groupRef.current.children.length: ${groupRef.current.children.length}`);

      // 🔥 POPOLAZIONE IMMEDIATA (come RadioCarousel3D)
      console.log(`📝 Tentativo di riempire ${categories.length} categorie, meshesRef.size: ${meshesRef.current.size}`);

      categories.forEach((category, i) => {
        if (renderedCategoriesRef.current.has(category.id)) {
          console.log(`  ⏭️ Categoria ${category.id} già renderizzata, skip`);
          return;
        }
        
        if (i >= MAX_SLOTS) {
          console.log(`  ⚠️ Troppe categorie (${categories.length}), max ${MAX_SLOTS}`);
          return;
        }
        
        const slotKey = `slot_${i}`;
        const slotMesh = meshesRef.current.get(slotKey);
        
        if (!slotMesh) {
          console.log(`  ❌ Slot ${i} non trovato in meshesRef`);
          return;
        }
        
        console.log(`  🔍 Slot ${i}: ✅ trovato per categoria: ${category.nome_gruppo}`);
        
        const newTexture = createTextTextureInternal(category, rendererRef.current || undefined);
        const material = slotMesh.material as THREE.MeshBasicMaterial;
        
        if (material.map) material.map.dispose();
        
        material.map = newTexture;
        material.opacity = 1;
        console.log('🚨 OPACITY SET TO 1 - material.opacity:', material.opacity);
        material.needsUpdate = true;
        
        console.log(`  ✅ Slot ${i} riempito e reso visibile (opacity: 1)`);
        
        renderedCategoriesRef.current.add(category.id);
      });
    };

    // Lancia il controllo asincrono
    console.log('🚀 Avvio polling per groupRef...');
    requestAnimationFrame(checkAndInit);
    
    // Cleanup: resetta flag quando componente viene smontato
    return () => {
      console.log('🧹 EmailCarousel3D unmounting, reset hasInitializedSlotsRef');
      hasInitializedSlotsRef.current = false;
    };
  }, [categories, assignedSenders]); // ← Re-init quando cambiano categorie

  // 🔄 REMOVED: No more geometry updates on zoom change (FOV handles it)

  // Rotate to active category
  useEffect(() => {
    if (!groupRef.current || !activeCategoryId) return;

    const activeIndex = categories.findIndex(cat => cat.id === activeCategoryId);
    
    if (activeIndex === -1) return;

    const targetAngle = -(activeIndex / MAX_SLOTS) * Math.PI * 2 + Math.PI / 2;
    gsap.to(groupRef.current.rotation, {
      y: targetAngle,
      duration: 1.2,
      ease: 'power2.inOut'
    });
  }, [activeCategoryId, categories]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-visible"
      style={{ position: 'relative' }}
    />
  );
};
