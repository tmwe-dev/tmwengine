import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';

interface BookProps {
  direction: 'forward' | 'backward' | 'idle';
  onAnimationComplete: () => void;
}

function Book({ direction, onAnimationComplete }: BookProps) {
  const turningPageRef = useRef<THREE.Group>(null);
  const animationProgress = useRef(0);
  const isAnimating = useRef(false);
  const targetRotation = useRef(0);

  useEffect(() => {
    if (direction !== 'idle') {
      isAnimating.current = true;
      animationProgress.current = 0;
      targetRotation.current = direction === 'forward' ? -Math.PI : Math.PI;
    }
  }, [direction]);

  useFrame((state, delta) => {
    if (!isAnimating.current || !turningPageRef.current) return;

    const speed = 3;
    animationProgress.current += delta * speed;

    if (animationProgress.current >= 1) {
      animationProgress.current = 1;
      isAnimating.current = false;
      turningPageRef.current.rotation.y = 0;
      onAnimationComplete();
      return;
    }

    const progress = animationProgress.current;
    const easeProgress = 1 - Math.pow(1 - progress, 4);
    turningPageRef.current.rotation.y = targetRotation.current * (1 - easeProgress);
  });

  return (
    <group rotation={[0.35, 0, 0]}>
      {/* Left cover */}
      <mesh position={[-1.3, 0, -0.05]}>
        <boxGeometry args={[1.3, 1.8, 0.08]} />
        <meshStandardMaterial color="#6366f1" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Right cover */}
      <mesh position={[1.3, 0, -0.05]}>
        <boxGeometry args={[1.3, 1.8, 0.08]} />
        <meshStandardMaterial color="#8b5cf6" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Spine */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[0.15, 1.8, 0.08]} />
        <meshStandardMaterial color="#4f46e5" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Left pages stack */}
      <mesh position={[-1.25, 0, 0]}>
        <boxGeometry args={[1.15, 1.65, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Right pages stack */}
      <mesh position={[1.25, 0, 0]}>
        <boxGeometry args={[1.15, 1.65, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Turning page */}
      <group ref={turningPageRef} position={[0, 0, 0.08]}>
        <mesh position={[0.575, 0, 0]}>
          <boxGeometry args={[1.15, 1.65, 0.01]} />
          <meshStandardMaterial color="#fefefe" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Page edges - left */}
      {[...Array(8)].map((_, i) => (
        <mesh key={`left-${i}`} position={[-1.25, 0, 0.08 - i * 0.015]}>
          <boxGeometry args={[1.14, 1.64, 0.005]} />
          <meshStandardMaterial color="#f9fafb" />
        </mesh>
      ))}

      {/* Page edges - right */}
      {[...Array(8)].map((_, i) => (
        <mesh key={`right-${i}`} position={[1.25, 0, 0.08 - i * 0.015]}>
          <boxGeometry args={[1.14, 1.64, 0.005]} />
          <meshStandardMaterial color="#f9fafb" />
        </mesh>
      ))}

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-3, -3, -3]} intensity={0.4} />
      <pointLight position={[0, 2, 3]} intensity={0.5} color="#a78bfa" />
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
