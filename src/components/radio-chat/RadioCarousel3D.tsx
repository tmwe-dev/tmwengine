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

  return new THREE.CanvasTexture(canvas);
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

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    groupRef.current = group;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
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

  // Update carousel with messages
  useEffect(() => {
    if (!groupRef.current) return;

    const group = groupRef.current;
    const aiMessages = messages.filter(m => m.sender_type !== 'human');
    
    const radius = 3.5;
    const angleStep = (Math.PI * 2) / MAX_SLOTS; // Angoli FISSI per 8 slot

    // 1️⃣ INIZIALIZZAZIONE: Crea carosello con slot INVISIBILI (solo prima volta)
    if (meshesRef.current.size === 0) {
      console.log('🎡 Creazione carosello con', MAX_SLOTS, 'slot invisibili');
      
      for (let i = 0; i < MAX_SLOTS; i++) {
        const emptyTexture = createEmptyTexture();
        const geometry = new THREE.PlaneGeometry(3.5, 5);
        const material = new THREE.MeshBasicMaterial({ 
          map: emptyTexture, 
          side: THREE.DoubleSide, 
          transparent: true,
          opacity: 0 // Completamente invisibile
        });
        const mesh = new THREE.Mesh(geometry, material);

        // Posizionamento fisso (identico al codice precedente)
        const angle = (i * angleStep) - Math.PI / 2 + (angleStep / 2);
        mesh.position.set(
          Math.cos(angle) * radius, 
          0, 
          Math.sin(angle) * radius
        );
        mesh.lookAt(new THREE.Vector3(0, 0, 0));
        mesh.rotateY(Math.PI);
        
        group.add(mesh);
        meshesRef.current.set(`slot_${i}`, mesh);
      }
      console.log('✅ Carosello creato, meshesRef.size:', meshesRef.current.size);
    }

    // 2️⃣ AGGIORNAMENTO: Riempi slot con messaggi REALI
    console.log('📝 Tentativo di riempire', aiMessages.length, 'messaggi, meshesRef.size:', meshesRef.current.size);
    aiMessages.forEach((msg, i) => {
      if (i >= MAX_SLOTS) return; // Ignora messaggi oltre il limite
      
      const slotMesh = meshesRef.current.get(`slot_${i}`);
      console.log(`  🔍 Slot ${i}:`, slotMesh ? '✅ trovato' : '❌ non trovato', 'per messaggio:', msg.sender_name);
      if (!slotMesh) return;

      // Verifica se il messaggio è già stato renderizzato
      if (renderedMessagesRef.current.has(msg.id)) {
        console.log(`  ⏩ Slot ${i} già popolato con ${msg.sender_name}, skip`);
        return;
      }

      const newTexture = createTextTexture(msg);
      const material = slotMesh.material as THREE.MeshBasicMaterial;
      
      // Rilascia vecchia texture per evitare memory leak
      if (material.map) material.map.dispose();
      
      material.map = newTexture;
      material.opacity = 1; // Rendi visibile
      material.transparent = false; // Forza rendering opaco
      material.needsUpdate = true;
      console.log(`  ✅ Slot ${i} riempito e reso visibile (opacity: 1)`);
      
      // Marca il messaggio come renderizzato
      renderedMessagesRef.current.add(msg.id);
    });
  }, [messages]);

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
