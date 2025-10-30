import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { EmailCarousel3DProps } from '@/types/email-carousel';
import { createCategoryTexture, createEmptyTexture } from '@/lib/email-carousel-texture';
import { useDroppable } from '@dnd-kit/core';

const EmailCarousel3D: React.FC<EmailCarousel3DProps> = ({
  categories,
  assignedSenders,
  activeCategoryId,
  onRotate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const hasInitializedSlotsRef = useRef(false);
  const renderedCategoriesRef = useRef<Set<string>>(new Set());

  const MAX_SLOTS = 8;

  // Droppable per il canvas
  const { setNodeRef, isOver } = useDroppable({
    id: 'email-carousel-canvas',
  });

  // 1️⃣ INIZIALIZZAZIONE SCENE (solo al mount)
  useEffect(() => {
    if (!containerRef.current) return;

    console.log('🎡 Inizializzazione EmailCarousel3D...');

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const fov = window.innerWidth < 768 ? 62 : 67; // FOV dinamico come Radio
    const camera = new THREE.PerspectiveCamera(
      fov,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0.3, 13.5); // IDENTICO a Radio
    camera.lookAt(0, 0.3, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, // Trasparenza per sfondo
      antialias: true 
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x8b5cf6, 1, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);
    
    console.log('💡 Luci configurate - ambient: 0.6, point: 0x8b5cf6');

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // ResizeObserver per gestire resize container
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio); // Mantieni HD su resize
    });

    resizeObserver.observe(containerRef.current);

    // Polling per creazione slot
    const checkAndInit = () => {
      if (!groupRef.current) {
        console.log('⏳ groupRef non pronto, riprovo...');
        requestAnimationFrame(checkAndInit);
        return;
      }

      if (hasInitializedSlotsRef.current) {
        console.log('✅ Slot già inizializzati, skip');
        return;
      }

      console.log('🎡 Creazione carosello con 8 slot');

      const radius = 7.8; // IDENTICO a Radio
      const scaleFactor = Math.min(window.innerWidth / 1200, 2.0);

      for (let i = 0; i < MAX_SLOTS; i++) {
        const angle = (i / MAX_SLOTS) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Dimensioni ridotte al 50% rispetto a Radio
        const geometry = new THREE.PlaneGeometry(
          (4.83 * scaleFactor) * 0.5,
          (7.04 * scaleFactor) * 0.5
        );

        const material = new THREE.MeshBasicMaterial({
          map: createEmptyTexture(),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0, // Invisibile inizialmente, fade-in su populate
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 0.82, z); // Y=0.82 come Radio
        mesh.lookAt(0, 0, 0);

        groupRef.current.add(mesh);
        meshesRef.current.set(`slot_${i}`, mesh);
        console.log(`  📍 Slot ${i} creato a posizione:`, mesh.position.toArray());
      }

      hasInitializedSlotsRef.current = true;
      renderedCategoriesRef.current.clear();
      console.log(`✅ Carosello creato, meshesRef.size: ${meshesRef.current.size}`);
    };

    console.log('🚀 Avvio polling per groupRef...');
    requestAnimationFrame(checkAndInit);

    return () => {
      console.log('🧹 EmailCarousel3D unmounting');
      hasInitializedSlotsRef.current = false;
      resizeObserver.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // 2️⃣ POPOLAZIONE CATEGORIE
  useEffect(() => {
    console.log('📝 useEffect categorie - categories:', categories.length, 'meshesRef:', meshesRef.current.size);

    if (!groupRef.current || meshesRef.current.size === 0) {
      console.log('⏸️ Gruppo o slot non pronti, skip popolazione');
      return;
    }

    console.log(`📝 Riempimento ${categories.length} categorie`);

    categories.forEach((category, i) => {
      if (renderedCategoriesRef.current.has(category.id)) {
        console.log(`  ⏭️ Categoria ${category.nome_gruppo} già renderizzata, skip`);
        return;
      }

      if (i >= MAX_SLOTS) {
        console.log(`  ⚠️ Troppe categorie (${categories.length}), max ${MAX_SLOTS}`);
        return;
      }

      const slotKey = `slot_${i}`;
      const slotMesh = meshesRef.current.get(slotKey);

      if (!slotMesh) {
        console.log(`  ❌ Slot ${i} non trovato`);
        return;
      }

      console.log(`  🔍 Slot ${i}: ✅ per categoria: ${category.nome_gruppo}`);

      const senders = assignedSenders.get(category.id) || [];
      const newTexture = createCategoryTexture(category, senders);
      const material = slotMesh.material as THREE.MeshBasicMaterial;

      if (material.map) material.map.dispose();

      material.map = newTexture;
      material.opacity = 1;
      material.needsUpdate = true;

      console.log(`  ✅ Slot ${i} riempito (opacity: 1)`);

      renderedCategoriesRef.current.add(category.id);
    });
  }, [categories, assignedSenders]);

  // 3️⃣ ROTAZIONE VERSO CATEGORIA ATTIVA
  useEffect(() => {
    if (!groupRef.current || !activeCategoryId) return;

    const activeIndex = categories.findIndex((cat) => cat.id === activeCategoryId);
    if (activeIndex === -1) return;

    const targetAngle = -(activeIndex / MAX_SLOTS) * Math.PI * 2 + Math.PI / 2;
    gsap.to(groupRef.current.rotation, {
      y: targetAngle,
      duration: 1.2,
      ease: 'power2.inOut',
    });
  }, [activeCategoryId, categories]);

  // 4️⃣ EFFETTO GLOW QUANDO isOver
  useEffect(() => {
    if (!activeCategoryId || meshesRef.current.size === 0) return;

    const activeIndex = categories.findIndex((cat) => cat.id === activeCategoryId);
    if (activeIndex === -1) return;

    const slotKey = `slot_${activeIndex}`;
    const mesh = meshesRef.current.get(slotKey);
    if (!mesh) return;

    if (isOver) {
      gsap.to(mesh.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.3 });
    } else {
      gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
    }
  }, [isOver, activeCategoryId, categories]);

  // Handler per aree cliccabili
  const handlePrev = () => {
    if (categories.length === 0) return;
    const currentIndex = categories.findIndex((cat) => cat.id === activeCategoryId);
    const newIndex = (currentIndex - 1 + categories.length) % categories.length;
    onRotate?.(categories[newIndex].id);
  };

  const handleNext = () => {
    if (categories.length === 0) return;
    const currentIndex = categories.findIndex((cat) => cat.id === activeCategoryId);
    const newIndex = (currentIndex + 1) % categories.length;
    onRotate?.(categories[newIndex].id);
  };

  return (
    <div ref={setNodeRef} className="relative h-full w-full">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Aree cliccabili sinistra/destra */}
      <div
        onClick={handlePrev}
        className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer hover:bg-white/5 transition-colors"
        style={{ zIndex: 10 }}
      />
      <div
        onClick={handleNext}
        className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer hover:bg-white/5 transition-colors"
        style={{ zIndex: 10 }}
      />
    </div>
  );
};

export default EmailCarousel3D;
