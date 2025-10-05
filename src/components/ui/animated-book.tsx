import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import libroGif from '@/assets/libro.gif';

interface BookProps {
  direction: 'forward' | 'backward' | 'idle';
  onAnimationComplete: () => void;
}

function Book({ direction, onAnimationComplete }: BookProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (direction !== 'idle') {
      setTimeout(() => {
        onAnimationComplete();
      }, 2000);
    }
  }, [direction, onAnimationComplete]);

  useFrame(() => {
    return;
  });

  return (
    <group rotation={[0.35, 0, 0]}>
      <mesh ref={meshRef}>
        <planeGeometry args={[4, 3]} />
        <meshBasicMaterial 
          transparent 
          opacity={0}
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
  const [showGif, setShowGif] = useState(false);
  const [gifKey, setGifKey] = useState(0);

  useEffect(() => {
    if (currentPage > previousPage.current) {
      direction.current = 'forward';
    } else if (currentPage < previousPage.current) {
      direction.current = 'backward';
      setShowGif(true);
      setGifKey(prev => prev + 1); // Force reload GIF
      setTimeout(() => {
        setShowGif(false);
      }, 2000);
    }
    previousPage.current = currentPage;
  }, [currentPage]);

  const handleAnimationComplete = () => {
    direction.current = 'idle';
  };

  return (
    <div className={className} style={{ height: '140px', background: 'transparent', position: 'relative' }}>
      <Canvas shadows>
        <OrthographicCamera makeDefault position={[0, 0, 8]} zoom={60} />
        <Book direction={direction.current} onAnimationComplete={handleAnimationComplete} />
      </Canvas>
      {showGif && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            key={gifKey}
            src={libroGif} 
            alt="Book animation" 
            className="w-full h-full object-contain"
            style={{ transform: 'perspective(1000px) rotateX(20deg)' }}
          />
        </div>
      )}
    </div>
  );
}
