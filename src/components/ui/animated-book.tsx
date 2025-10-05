import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';

interface BookProps {
  direction: 'forward' | 'backward' | 'idle';
  onAnimationComplete: () => void;
}

function Book({ direction, onAnimationComplete }: BookProps) {
  const leftPageRef = useRef<THREE.Mesh>(null);
  const rightPageRef = useRef<THREE.Mesh>(null);
  const animationProgress = useRef(0);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (direction !== 'idle') {
      isAnimating.current = true;
      animationProgress.current = 0;
    }
  }, [direction]);

  useFrame((state, delta) => {
    if (!isAnimating.current || !leftPageRef.current || !rightPageRef.current) return;

    // Animate the page turn
    const speed = 2.5;
    animationProgress.current += delta * speed;

    if (animationProgress.current >= 1) {
      animationProgress.current = 1;
      isAnimating.current = false;
      onAnimationComplete();
    }

    const progress = animationProgress.current;
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

    if (direction === 'forward') {
      // Right page turns to the left
      rightPageRef.current.rotation.y = -Math.PI * easeProgress;
    } else if (direction === 'backward') {
      // Left page turns to the right
      leftPageRef.current.rotation.y = Math.PI * easeProgress;
    }
  });

  return (
    <group>
      {/* Book cover/base */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[2.4, 1.8, 0.1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Left page */}
      <mesh ref={leftPageRef} position={[-0.6, 0, 0]}>
        <boxGeometry args={[1.2, 1.6, 0.02]} />
        <meshStandardMaterial color="#F5F5DC" side={THREE.DoubleSide} />
      </mesh>

      {/* Right page */}
      <mesh ref={rightPageRef} position={[0.6, 0, 0]}>
        <boxGeometry args={[1.2, 1.6, 0.02]} />
        <meshStandardMaterial color="#F5F5DC" side={THREE.DoubleSide} />
      </mesh>

      {/* Page separator line */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.02, 1.6, 0.04]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
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
    <div className={className} style={{ height: '120px' }}>
      <Canvas>
        <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={80} />
        <Book direction={direction.current} onAnimationComplete={handleAnimationComplete} />
      </Canvas>
    </div>
  );
}
