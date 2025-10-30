import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EmailCarousel3DProps } from '@/types/email-carousel';
import { createCategoryTexture, createEmptyTexture } from '@/lib/email-carousel-texture';

export const EmailCarousel3D = ({
  categories, 
  assignedSenders,
  activeCategoryId,
  onRotate
}: EmailCarousel3DProps) => {
  const MAX_SLOTS = 8; // Numero massimo di pagine nel carosello
  
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

  // 1️⃣ INIZIALIZZAZIONE SLOT (aspetta che groupRef sia pronto) - GEOMETRIA FISSA
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
        console.log('⏭️ Slot già inizializzati, skip re-init (update in-place gestito da altro useEffect)');
        return;
      }

      console.log(`🎡 Creazione carosello con ${MAX_SLOTS} slot invisibili (geometria fissa)`);
      
      const group = groupRef.current;
      const radius = 7.8; // ✅ FISSO (no zoom scaling)
      const angleStep = (Math.PI * 2) / MAX_SLOTS;
      
      for (let i = 0; i < MAX_SLOTS; i++) {
        const scaleFactor = Math.min(window.innerWidth / 1200, 2.0);
        const geometry = new THREE.PlaneGeometry(4.83 * scaleFactor, 7.04 * scaleFactor); // ✅ FISSO
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
          0.82, // ✅ FISSO (no zoom scaling)
          Math.sin(angle) * radius
        );
        mesh.lookAt(new THREE.Vector3(0, 0, 0));
        
        group.add(mesh);
        meshesRef.current.set(`slot_${i}`, mesh);
        console.log(`  📍 Slot ${i} creato a posizione:`, mesh.position.toArray());
      }
      
      hasInitializedSlotsRef.current = true;
      renderedCategoriesRef.current.clear(); // Reset categorie renderizzate
      console.log(`✅ Carosello creato, meshesRef.size: ${meshesRef.current.size}`);
      console.log(`✅ groupRef.current.children.length: ${groupRef.current.children.length}`);
    };

    // Lancia il controllo asincrono
    console.log('🚀 Avvio polling per groupRef...');
    requestAnimationFrame(checkAndInit);
    
    // Cleanup: resetta flag quando componente viene smontato
    return () => {
      console.log('🧹 EmailCarousel3D unmounting, reset hasInitializedSlotsRef');
      hasInitializedSlotsRef.current = false;
    };
  }, []); // ← Init solo una volta al mount

  // 2️⃣ POPOLAZIONE CATEGORIE (si attiva quando arrivano nuove categorie)
  useEffect(() => {
    console.log('📝 useEffect categorie - categories:', categories.length, 'meshesRef:', meshesRef.current.size, 'groupReady:', !!groupRef.current);
    
    if (!groupRef.current || meshesRef.current.size === 0) {
      console.log('⏸️ Gruppo o slot non pronti, skip popolazione categorie');
      return;
    }
    
    console.log(`📝 Tentativo di riempire ${categories.length} categorie, meshesRef.size: ${meshesRef.current.size}`);
    
    categories.forEach((category, i) => {
      // Skip se già renderizzata
      if (renderedCategoriesRef.current.has(category.id)) {
        console.log(`  ⏭️ Categoria ${category.id} (${category.nome_gruppo}) già renderizzata, skip`);
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
      
      const senders = assignedSenders.get(category.id) || [];
      const newTexture = createCategoryTexture(category, senders, rendererRef.current || undefined);
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
      
      renderedCategoriesRef.current.add(category.id);
    });
  }, [categories, assignedSenders]); // ← Dipende da categories e assignedSenders

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
