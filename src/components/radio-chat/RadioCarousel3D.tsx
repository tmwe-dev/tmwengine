import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { RadioMessage } from '@/types/radio';

interface RadioCarousel3DProps {
  messages: RadioMessage[];
  activeMessageId: string;
  onRotationComplete?: () => void;
}

const createTextTexture = (message: RadioMessage): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#0f0f1e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = '#4a4a6a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  // Sender name
  ctx.fillStyle = '#8b5cf6';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(message.sender_name, canvas.width / 2, 60);

  // Message content (word wrap)
  ctx.fillStyle = '#ffffff';
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

export const RadioCarousel3D = ({ 
  messages, 
  activeMessageId,
  onRotationComplete 
}: RadioCarousel3DProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

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
    const aiMessages = messages.filter(m => m.sender_type !== 'human').slice(-7);
    
    // Clear existing meshes
    meshesRef.current.forEach(mesh => group.remove(mesh));
    meshesRef.current.clear();

    if (aiMessages.length === 0) return;

    const radius = 2.5;
    
    aiMessages.forEach((msg, i) => {
      const texture = createTextTexture(msg);
      const geometry = new THREE.PlaneGeometry(2, 3);
      const material = new THREE.MeshBasicMaterial({ 
        map: texture, 
        side: THREE.DoubleSide, 
        transparent: true 
      });
      const mesh = new THREE.Mesh(geometry, material);

      const angle = (i / aiMessages.length) * Math.PI * 2;
      mesh.position.set(
        Math.cos(angle) * radius, 
        0, 
        Math.sin(angle) * radius
      );
      mesh.lookAt(new THREE.Vector3(0, 0, 0));
      
      group.add(mesh);
      meshesRef.current.set(msg.id, mesh);
    });
  }, [messages]);

  // Rotate to active message
  useEffect(() => {
    if (!groupRef.current || !activeMessageId) return;

    const aiMessages = messages.filter(m => m.sender_type !== 'human').slice(-7);
    const activeIndex = aiMessages.findIndex(m => m.id === activeMessageId);
    
    if (activeIndex === -1) return;

    const targetAngle = -(activeIndex / aiMessages.length) * Math.PI * 2;
    
    gsap.to(groupRef.current.rotation, {
      y: targetAngle,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete: () => {
        if (onRotationComplete) {
          setTimeout(onRotationComplete, 200);
        }
      }
    });
  }, [activeMessageId, messages, onRotationComplete]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
    />
  );
};
