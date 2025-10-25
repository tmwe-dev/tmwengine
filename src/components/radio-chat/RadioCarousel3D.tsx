import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { RadioMessage } from '@/types/radio';

interface RadioCarousel3DProps {
  messages: RadioMessage[];
  activeMessageId: string;
}

const createTextTexture = (message: RadioMessage): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // Background - Paper white
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sender name - Dark color
  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(message.sender_name, canvas.width / 2, 60);

  // Message content (word wrap) - Dark gray
  ctx.fillStyle = '#2d2d2d';
  ctx.font = '24px Arial';
  ctx.textAlign = 'left';
  
  const words = message.content.split(' ');
  const lines: string[] = [];
  let line = '';
  const maxWidth = canvas.width - 60;
  
  for (const word of words) {
    const testLine = line + word + ' ';
    const width = ctx.measureText(testLine).width;
    if (width > maxWidth && line !== '') {
      lines.push(line);
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // Draw lines
  const lineHeight = 36;
  const startY = 120;
  lines.slice(0, 15).forEach((l, i) => {
    ctx.fillText(l.trim(), 30, startY + i * lineHeight);
  });

  const texture = new THREE.CanvasTexture(canvas);
  console.log("🎨 createTextTexture():", {
    sender: message.sender_name,
    width: canvas.width,
    height: canvas.height,
    preview: canvas.toDataURL().substring(0, 60) + "...",
  });
  return texture;
};

const createEmptyTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;
  
  // Canvas completamente trasparente (nessun contenuto visibile)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  return new THREE.CanvasTexture(canvas);
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
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
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
      const radius = 3.5;
      const angleStep = (Math.PI * 2) / MAX_SLOTS;
      
      for (let i = 0; i < MAX_SLOTS; i++) {
        const geometry = new THREE.PlaneGeometry(3.5, 5);
        const material = new THREE.MeshBasicMaterial({ 
          side: THREE.DoubleSide, 
          transparent: true,
          opacity: 0 // Invisibile inizialmente
        });
        const mesh = new THREE.Mesh(geometry, material);

        // Posizionamento fisso
        const angle = (i * angleStep) - Math.PI / 2 + (angleStep / 2);
        mesh.position.set(
          Math.cos(angle) * radius, 
          0, 
          Math.sin(angle) * radius
        );
        mesh.lookAt(new THREE.Vector3(0, 0, 0));
        // mesh.rotateY(Math.PI); // ← Rimosso: lookAt orienta già correttamente
        
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
      
      const newTexture = createTextTexture(msg);
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
      className="w-full h-full"
    />
  );
};
