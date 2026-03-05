import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { RadioMessage } from '@/types/radio';
import { createTextTexture } from './carousel/carouselTextures';
import { createCarouselScene, initializeSlots, startAnimationLoop } from './carousel/carouselScene';

interface RadioCarousel3DProps {
  messages: RadioMessage[];
  activeMessageId: string;
  zoom?: number;
  verticalOffset?: number;
}

const MAX_SLOTS = 8;

export const RadioCarousel3D = ({
  messages,
  activeMessageId,
  zoom = 1.0,
  verticalOffset = 0
}: RadioCarousel3DProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const renderedMessagesRef = useRef<Set<string>>(new Set());
  const hasInitializedSlotsRef = useRef(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const { scene, camera, renderer, group } = createCarouselScene(containerRef.current);
    cameraRef.current = camera;
    rendererRef.current = renderer;
    groupRef.current = group;

    startAnimationLoop(renderer, scene, camera);

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  // ResizeObserver for container changes
  useEffect(() => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
          rendererRef.current.setPixelRatio(window.devicePixelRatio);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Zoom via FOV
  useEffect(() => {
    if (!cameraRef.current) return;
    const baseFOV = 50;
    cameraRef.current.fov = baseFOV / zoom;
    cameraRef.current.updateProjectionMatrix();
  }, [zoom]);

  // Vertical camera offset
  useEffect(() => {
    if (!cameraRef.current) return;
    const cameraYOffset = -(verticalOffset || 0) * 0.01;
    const newY = 0.3 + cameraYOffset;
    gsap.to(cameraRef.current.position, { y: newY, duration: 0.3, ease: 'power2.out' });
  }, [verticalOffset]);

  // Initialize slots
  useEffect(() => {
    let attemptCount = 0;

    const checkAndInit = () => {
      if (!groupRef.current) {
        attemptCount++;
        if (attemptCount < 10) requestAnimationFrame(checkAndInit);
        return;
      }
      if (hasInitializedSlotsRef.current) return;

      initializeSlots(groupRef.current, meshesRef.current, MAX_SLOTS);
      hasInitializedSlotsRef.current = true;
      renderedMessagesRef.current.clear();
    };

    requestAnimationFrame(checkAndInit);
    return () => {
      hasInitializedSlotsRef.current = false;
      // ✅ FIX 2.3: Cleanup texture memory on unmount
      meshesRef.current.forEach((mesh) => {
        const material = mesh.material as THREE.MeshBasicMaterial;
        if (material.map) {
          material.map.dispose();
          material.map = null;
        }
      });
      renderedMessagesRef.current.clear();
    };
  }, []);

  // Populate messages into slots
  useEffect(() => {
    if (!groupRef.current || meshesRef.current.size === 0) return;

    const aiMessages = messages.filter(m => m.sender_type !== 'human');

    aiMessages.forEach((msg, i) => {
      if (renderedMessagesRef.current.has(msg.id) || i >= MAX_SLOTS) return;

      const slotMesh = meshesRef.current.get(`slot_${i}`);
      if (!slotMesh) return;

      const newTexture = createTextTexture(msg, rendererRef.current || undefined);
      const material = slotMesh.material as THREE.MeshBasicMaterial;
      if (material.map) material.map.dispose();

      material.map = newTexture;
      material.opacity = 1;
      material.needsUpdate = true;
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
      className="w-full h-full overflow-visible"
      style={{ position: 'relative' }}
    />
  );
};
