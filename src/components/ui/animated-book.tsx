import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import bookForward from '@/assets/book-page-forward.png';
import bookBackward from '@/assets/book-page-backward.png';
import libroGif from '@/assets/libro.gif';

interface BookProps {
  direction: 'forward' | 'backward' | 'idle';
  onAnimationComplete: () => void;
}

function Book({ direction, onAnimationComplete }: BookProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const animationProgress = useRef(0);
  const isAnimating = useRef(false);
  const [currentTexture, setCurrentTexture] = useState<'idle' | 'forward' | 'backward'>('idle');
  const [showGif, setShowGif] = useState(false);
  
  const forwardTexture = useLoader(THREE.TextureLoader, bookForward);
  const backwardTexture = useLoader(THREE.TextureLoader, bookBackward);
  const gifTexture = useLoader(THREE.TextureLoader, libroGif);

  useEffect(() => {
    if (direction !== 'idle') {
      isAnimating.current = true;
      animationProgress.current = 0;
      setCurrentTexture(direction);
      
      if (direction === 'backward') {
        setShowGif(true);
        setTimeout(() => {
          setShowGif(false);
          isAnimating.current = false;
          setCurrentTexture('idle');
          onAnimationComplete();
        }, 2000);
      }
    }
  }, [direction, onAnimationComplete]);

  useFrame((state, delta) => {
    if (!isAnimating.current || !meshRef.current || showGif) return;

    const speed = 2;
    animationProgress.current += delta * speed;

    if (animationProgress.current >= 1) {
      animationProgress.current = 1;
      isAnimating.current = false;
      setCurrentTexture('idle');
      onAnimationComplete();
      return;
    }

    const progress = animationProgress.current;
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.9 + (Math.sin(easeProgress * Math.PI) * 0.1);
  });

  const texture = showGif ? gifTexture :
                 currentTexture === 'forward' ? forwardTexture : 
                 currentTexture === 'backward' ? backwardTexture : forwardTexture;

  return (
    <group rotation={[0.35, 0, 0]}>
      <mesh ref={meshRef}>
        <planeGeometry args={[4, 3]} />
        <meshBasicMaterial 
          map={texture} 
          transparent 
          opacity={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 3, 2]} intensity={0.6} />
    </group>
  );
}

interface AnimatedBookProps {
  currentPage: number;
  className?: string;
}

export function AnimatedBook({ currentPage, className }: AnimatedBookProps) {
  const previousPage = useRef(currentPage);
  const direction = useRef<'forward' | 'backward' | 'idle'>('idle');

  useEffect(() => {
    if (currentPage > previousPage.current) {
      direction.current = 'forward';
    } else if (currentPage < previousPage.current) {
      direction.current = 'backward';
    }
    previousPage.current = currentPage;
  }, [currentPage]);

  const handleAnimationComplete = () => {
    direction.current = 'idle';
  };

  return (
    <div className={className} style={{ height: '140px', background: 'transparent' }}>
      <Canvas shadows>
        <OrthographicCamera makeDefault position={[0, 0, 8]} zoom={60} />
        <Book direction={direction.current} onAnimationComplete={handleAnimationComplete} />
      </Canvas>
    </div>
  );
}
