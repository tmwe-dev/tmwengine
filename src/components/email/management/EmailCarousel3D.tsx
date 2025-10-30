import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { EmailCarousel3DProps } from '@/types/email-carousel';
import { createCategoryTexture, createEmptyTexture } from '@/lib/email-carousel-texture';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const carouselGroupRef = useRef<THREE.Group | null>(null);
  const slotsRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const MAX_SLOTS = 8;

  // Droppable per il canvas
  const { setNodeRef, isOver } = useDroppable({
    id: 'email-carousel-canvas',
  });

  // Inizializzazione Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 18);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Carousel group
    const carouselGroup = new THREE.Group();
    scene.add(carouselGroup);
    carouselGroupRef.current = carouselGroup;

    // Create slots
    const radius = 7.8;
    const angleStep = (Math.PI * 2) / MAX_SLOTS;

    for (let i = 0; i < MAX_SLOTS; i++) {
      const angle = i * angleStep;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;

      const geometry = new THREE.PlaneGeometry(4, 5.5);
      const material = new THREE.MeshStandardMaterial({
        map: createEmptyTexture(),
        side: THREE.DoubleSide,
        transparent: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, 0, z);
      mesh.lookAt(0, 0, 0);
      mesh.visible = false;

      carouselGroup.add(mesh);
      slotsRef.current.push(mesh);
    }

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Popola le card con le categorie
  useEffect(() => {
    if (!rendererRef.current || categories.length === 0) return;

    categories.forEach((category, index) => {
      if (index >= MAX_SLOTS) return;

      const mesh = slotsRef.current[index];
      const senders = assignedSenders.get(category.id) || [];
      const texture = createCategoryTexture(category, senders);

      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.map = texture;
        mesh.material.needsUpdate = true;
      }
      mesh.visible = true;
    });
  }, [categories, assignedSenders]);

  // Rotazione verso categoria attiva
  useEffect(() => {
    if (!carouselGroupRef.current || !activeCategoryId) return;

    const activeIndex = categories.findIndex((cat) => cat.id === activeCategoryId);
    if (activeIndex === -1) return;

    const angleStep = (Math.PI * 2) / MAX_SLOTS;
    const targetRotation = -activeIndex * angleStep;

    gsap.to(carouselGroupRef.current.rotation, {
      y: targetRotation,
      duration: 0.8,
      ease: 'power2.out',
    });

    setCurrentIndex(activeIndex);
  }, [activeCategoryId, categories]);

  // Effetto glow quando isOver
  useEffect(() => {
    if (!slotsRef.current[currentIndex]) return;

    const mesh = slotsRef.current[currentIndex];
    if (isOver) {
      gsap.to(mesh.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.3 });
    } else {
      gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
    }
  }, [isOver, currentIndex]);

  const handlePrev = () => {
    if (categories.length === 0) return;
    const newIndex = (currentIndex - 1 + categories.length) % categories.length;
    onRotate?.(categories[newIndex].id);
  };

  const handleNext = () => {
    if (categories.length === 0) return;
    const newIndex = (currentIndex + 1) % categories.length;
    onRotate?.(categories[newIndex].id);
  };

  return (
    <div className="relative h-full w-full flex flex-col">
      <div ref={setNodeRef} className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Controlli */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <Button variant="outline" size="icon" onClick={handlePrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-sm text-muted-foreground">
          {categories[currentIndex]?.nome_gruppo || 'Nessuna categoria'}
        </div>

        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default EmailCarousel3D;
