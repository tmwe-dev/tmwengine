import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { RadioMessage } from '@/types/radio';

interface RadioCarousel3DProps {
  messages: RadioMessage[];
  activeMessageId: string;
}

const createTextTexture = (message: RadioMessage, renderer?: THREE.WebGLRenderer): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const DPR = window.devicePixelRatio || 2;

  // Misure reali ad alta risoluzione (PIÙ PICCOLE = PIÙ NITIDE)
  const W = 800;
  const H = 1100;

  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR); // Fondamentale per font nitidi

  // Configurazione colori per ogni tipo di sender (come nelle card messages)
  const gradientConfig = {
    human: { 
      from: 'rgba(59, 130, 246, 0.1)',    // blue-500/10
      to: 'rgba(37, 99, 235, 0.05)',      // blue-600/5
      border: 'rgba(59, 130, 246, 0.2)',  // blue-500/20
      title: '#1e40af',                    // blue-800
      badge: '#2563eb'                     // blue-600
    },
    chatgpt: { 
      from: 'rgba(34, 197, 94, 0.1)',     // green-500/10
      to: 'rgba(22, 163, 74, 0.05)',      // green-600/5
      border: 'rgba(34, 197, 94, 0.2)',   // green-500/20
      title: '#166534',                    // green-800
      badge: '#16a34a'                     // green-600
    },
    gemini: { 
      from: 'rgba(6, 182, 212, 0.1)',     // cyan-500/10
      to: 'rgba(8, 145, 178, 0.05)',      // cyan-600/5
      border: 'rgba(6, 182, 212, 0.2)',   // cyan-500/20
      title: '#155e75',                    // cyan-800
      badge: '#0891b2'                     // cyan-600
    },
    claude: { 
      from: 'rgba(168, 85, 247, 0.1)',    // purple-500/10
      to: 'rgba(147, 51, 234, 0.05)',     // purple-600/5
      border: 'rgba(168, 85, 247, 0.2)',  // purple-500/20
      title: '#6b21a8',                    // purple-800
      badge: '#9333ea'                     // purple-600
    }
  };

  const senderType = message.sender_type as 'human' | 'chatgpt' | 'gemini' | 'claude';
  const colors = gradientConfig[senderType];

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

  // Badge tipo agente (top-right corner, ma specchiato diventa top-left)
  const badgeText = senderType.toUpperCase();
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

  // Titolo (nome sender) con colore del brand
  ctx.fillStyle = colors.title;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(message.sender_name, W / 2, 80);

  // Corpo messaggio in bianco
  ctx.fillStyle = '#ffffff'; // white
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'left';

  const lineHeight = 32;
  const maxWidth = W - 80;
  const words = message.content.split(' ');
  let x = 40;
  let y = 140; // Spostato più in basso per fare spazio al badge
  let line = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);

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
    sender: message.sender_name,
    canvasSize: `${canvas.width}x${canvas.height}`,
    logicalSize: `${W}x${H}`,
    DPR: DPR,
    anisotropy: texture.anisotropy
  });
  
  return texture;
};

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

export const RadioCarousel3D = ({
  messages, 
  activeMessageId
}: RadioCarousel3DProps) => {
  const MAX_SLOTS = 8; // Numero massimo di pagine nel carosello
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const renderedMessagesRef = useRef<Set<string>>(new Set());
  const hasInitializedSlotsRef = useRef(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
        const fov = window.innerWidth < 768 ? 65 : 70; // FOV più ampio per carosello grande
        const camera = new THREE.PerspectiveCamera(
          fov,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          1000
        );
        camera.position.set(0, 0, 13); // Camera più distante per pagine grandi
    camera.lookAt(0, 0, 0);

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

    // 🧪 TEST VISIBILITÀ: cubo rosso sempre visibile
    const testGeometry = new THREE.BoxGeometry(1, 1, 1);
    const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const testCube = new THREE.Mesh(testGeometry, testMaterial);
    testCube.position.set(0, 0, 0);
    scene.add(testCube);
    console.log('🧪 Cubo di test creato al centro scena');

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    groupRef.current = group;

    // Animation loop
    let frameCount = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Debug: conta mesh visibili ogni 60 frame
      if (frameCount % 60 === 0 && groupRef.current) {
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

  // 1️⃣ INIZIALIZZAZIONE SLOT (aspetta che groupRef sia pronto)
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

      if (hasInitializedSlotsRef.current) {
        console.log('⏭️ Slot già inizializzati, skip');
        return;
      }

      console.log(`🎡 Creazione carosello con ${MAX_SLOTS} slot invisibili`);
      
      const group = groupRef.current;
      const radius = 8.25; // Aumentato del 37.5% totale
      const angleStep = (Math.PI * 2) / MAX_SLOTS;
      
      for (let i = 0; i < MAX_SLOTS; i++) {
        const scaleFactor = Math.min(window.innerWidth / 1200, 2.0);
        const geometry = new THREE.PlaneGeometry(5.84 * scaleFactor, 8.42 * scaleFactor); // Aumentato del 37.5% totale
        const material = new THREE.MeshBasicMaterial({
          side: THREE.DoubleSide, 
          transparent: true,
          opacity: 0 // Invisibile inizialmente
        });
        const mesh = new THREE.Mesh(geometry, material);

        // Posizionamento fisso - senso ANTIORARIO
        const angle = -(i * angleStep) + Math.PI;
        mesh.position.set(
          Math.cos(angle) * radius, 
          0, 
          Math.sin(angle) * radius
        );
        mesh.lookAt(new THREE.Vector3(0, 0, 0));
        
        group.add(mesh);
        meshesRef.current.set(`slot_${i}`, mesh);
        console.log(`  📍 Slot ${i} creato a posizione:`, mesh.position.toArray());
      }
      
      hasInitializedSlotsRef.current = true;
      renderedMessagesRef.current.clear(); // Reset messaggi renderizzati
      console.log(`✅ Carosello creato, meshesRef.size: ${meshesRef.current.size}`);
      console.log(`✅ groupRef.current.children.length: ${groupRef.current.children.length}`);
    };

    // Lancia il controllo asincrono
    console.log('🚀 Avvio polling per groupRef...');
    requestAnimationFrame(checkAndInit);
  }, []); // ← ARRAY VUOTO: esegue solo al mount, ma poi aspetta attivamente

  // 2️⃣ POPOLAZIONE MESSAGGI (si attiva quando arrivano nuovi messaggi)
  useEffect(() => {
    console.log('📝 useEffect messaggi - messages:', messages.length, 'meshesRef:', meshesRef.current.size, 'groupReady:', !!groupRef.current);
    
    if (!groupRef.current || meshesRef.current.size === 0) {
      console.log('⏸️ Gruppo o slot non pronti, skip popolazione messaggi');
      return;
    }
    
    const aiMessages = messages.filter(m => m.sender_type !== 'human');
    console.log(`📝 Tentativo di riempire ${aiMessages.length} messaggi AI, meshesRef.size: ${meshesRef.current.size}`);
    
    aiMessages.forEach((msg, i) => {
      // Skip se già renderizzato
      if (renderedMessagesRef.current.has(msg.id)) {
        console.log(`  ⏭️ Messaggio ${msg.id} (${msg.sender_name}) già renderizzato, skip`);
        return;
      }
      
      if (i >= MAX_SLOTS) {
        console.log(`  ⚠️ Troppi messaggi (${aiMessages.length}), max ${MAX_SLOTS}`);
        return;
      }
      
      const slotKey = `slot_${i}`;
      const slotMesh = meshesRef.current.get(slotKey);
      
      if (!slotMesh) {
        console.log(`  ❌ Slot ${i} non trovato in meshesRef`);
        return;
      }
      
      console.log(`  🔍 Slot ${i}: ✅ trovato per messaggio: ${msg.sender_name}`);
      
      const newTexture = createTextTexture(msg, rendererRef.current || undefined);
      const material = slotMesh.material as THREE.MeshBasicMaterial;
      
      // Rilascia vecchia texture
      if (material.map) material.map.dispose();
      
      material.map = newTexture;
      material.opacity = 1;
      material.needsUpdate = true;
      
      console.log(`  ✅ Slot ${i} riempito e reso visibile (opacity: 1)`);
      console.log(`    🔎 Material:`, {
        opacity: material.opacity,
        transparent: material.transparent,
        map: !!material.map,
        visible: slotMesh.visible,
        side: material.side,
      });
      console.log(`    📍 Posizione:`, slotMesh.position.toArray());
      console.log(`    🔄 Rotazione:`, slotMesh.rotation.toArray());
      
      renderedMessagesRef.current.add(msg.id);
    });
  }, [messages]); // ← Dipende SOLO da messages

  // Rotate to active message
  useEffect(() => {
    if (!groupRef.current || !activeMessageId) return;

    const aiMessages = messages.filter(m => m.sender_type !== 'human');
    const activeIndex = aiMessages.findIndex(m => m.id === activeMessageId);
    
    if (activeIndex === -1) return;

    const targetAngle = -(activeIndex / MAX_SLOTS) * Math.PI * 2 + Math.PI / 2;
    
    gsap.to(groupRef.current.rotation, {
      y: targetAngle,
      duration: 1.2,
      ease: 'power2.inOut'
    });
  }, [activeMessageId, messages]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-visible"
      style={{ position: 'relative' }}
    />
  );
};
