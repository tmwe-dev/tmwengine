import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import libroGif from '@/assets/libro.gif';

interface BookProps {
  direction: 'forward' | 'backward' | 'idle';
  onAnimationComplete: () => void;
}

function Book({ direction, onAnimationComplete }: BookProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const animationProgress = useRef(0);
  const isAnimating = useRef(false);
  const [showGif, setShowGif] = useState(false);
  
  const gifTexture = useLoader(THREE.TextureLoader, libroGif);

  useEffect(() => {
    if (direction !== 'idle') {
      isAnimating.current = true;
      animationProgress.current = 0;
      
      if (direction === 'backward') {
        setShowGif(true);
        setTimeout(() => {
          setShowGif(false);
          isAnimating.current = false;
          onAnimationComplete();
        }, 2000);
      } else {
        // For forward direction, just complete immediately
        setTimeout(() => {
          isAnimating.current = false;
          onAnimationComplete();
        }, 100);
      }
    }
  }, [direction, onAnimationComplete]);

  useFrame(() => {
    // No animation needed, just display the GIF
    return;
  });

  return (
    <group rotation={[0.35, 0, 0]}>
      <mesh ref={meshRef}>
        <planeGeometry args={[4, 3]} />
        <meshBasicMaterial 
          map={gifTexture} 
          transparent 
          opacity={1}
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
