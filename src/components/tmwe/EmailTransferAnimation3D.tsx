import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Badge } from '@/components/ui/badge';

interface EmailTransferAnimation3DProps {
  serverCount: number;
  dbCount: number;
  flyingCount: number;
  currentFolder: string;
  isAnimating: boolean;
}

// Componente cartella 3D
function FolderBox({ position, label, count, color }: { 
  position: [number, number, number]; 
  label: string; 
  count: number;
  color: string;
}) {
  return (
    <group position={position}>
      {/* Box cartella */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2, 1.5, 0.3]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
      </mesh>
      
      {/* Tab cartella */}
      <mesh position={[0, 0.75, 0.16]} castShadow>
        <boxGeometry args={[1, 0.3, 0.02]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
      </mesh>
      
      {/* Label */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-bold.woff"
      >
        {label}
      </Text>
      
      {/* Counter */}
      <Text
        position={[0, -1, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-bold.woff"
      >
        {count.toLocaleString()}
      </Text>
    </group>
  );
}

// Componente foglio email
function EmailSheet({ startPos, endPos, delay, onComplete }: {
  startPos: [number, number, number];
  endPos: [number, number, number];
  delay: number;
  onComplete: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  const started = useRef(false);
  const completed = useRef(false);

  useFrame((state, delta) => {
    if (!meshRef.current || completed.current) return;

    // Aspetta delay
    if (!started.current) {
      delay -= delta;
      if (delay <= 0) {
        started.current = true;
      }
      return;
    }

    // Anima lungo curva di Bezier
    progress.current += delta * 0.8; // Velocità
    
    if (progress.current >= 1) {
      progress.current = 1;
      completed.current = true;
      onComplete();
      return;
    }

    const t = progress.current;
    const t2 = t * t;
    const t3 = t2 * t;
    
    // Curva di Bezier cubica con arco verso l'alto
    const controlPoint1 = [startPos[0], startPos[1] + 3, startPos[2]];
    const controlPoint2 = [endPos[0], endPos[1] + 3, endPos[2]];
    
    const x = Math.pow(1-t, 3) * startPos[0] + 
              3 * Math.pow(1-t, 2) * t * controlPoint1[0] +
              3 * (1-t) * t2 * controlPoint2[0] +
              t3 * endPos[0];
              
    const y = Math.pow(1-t, 3) * startPos[1] + 
              3 * Math.pow(1-t, 2) * t * controlPoint1[1] +
              3 * (1-t) * t2 * controlPoint2[1] +
              t3 * endPos[1];
              
    const z = Math.pow(1-t, 3) * startPos[2] + 
              3 * Math.pow(1-t, 2) * t * controlPoint1[2] +
              3 * (1-t) * t2 * controlPoint2[2] +
              t3 * endPos[2];

    meshRef.current.position.set(x, y, z);
    
    // Rotazione durante il volo
    meshRef.current.rotation.z = t * Math.PI * 2;
    meshRef.current.rotation.y = t * Math.PI;
  });

  return (
    <mesh ref={meshRef} position={startPos} castShadow>
      <planeGeometry args={[0.4, 0.3]} />
      <meshStandardMaterial 
        color="#ffffff" 
        side={THREE.DoubleSide}
        emissive="#3b82f6"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

// Scene principale
function Scene({ serverCount, dbCount, flyingCount, isAnimating }: Omit<EmailTransferAnimation3DProps, 'currentFolder'>) {
  const [flyingSheets, setFlyingSheets] = useState<Array<{ id: number; delay: number }>>([]);

  useEffect(() => {
    if (flyingCount > 0 && isAnimating) {
      // Crea nuovi fogli in volo
      const sheets = Array.from({ length: Math.min(flyingCount, 20) }, (_, i) => ({
        id: Date.now() + i,
        delay: i * 0.05 // Partono sfasati
      }));
      setFlyingSheets(sheets);
    } else {
      setFlyingSheets([]);
    }
  }, [flyingCount, isAnimating]);

  const handleSheetComplete = (id: number) => {
    setFlyingSheets(prev => prev.filter(s => s.id !== id));
  };

  return (
    <>
      {/* Luci */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={1} 
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 5, 5]} intensity={0.5} color="#60a5fa" />

      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 2, 10]} fov={45} />
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
      />

      {/* Cartella Server (sinistra) */}
      <FolderBox 
        position={[-4, 0, 0]} 
        label="SERVER" 
        count={serverCount}
        color="#ef4444"
      />

      {/* Cartella Database (destra) */}
      <FolderBox 
        position={[4, 0, 0]} 
        label="DATABASE" 
        count={dbCount}
        color="#22c55e"
      />

      {/* Fogli email in volo */}
      {flyingSheets.map((sheet) => (
        <EmailSheet
          key={sheet.id}
          startPos={[-4, 0.5, 0.5]}
          endPos={[4, 0.5, 0.5]}
          delay={sheet.delay}
          onComplete={() => handleSheetComplete(sheet.id)}
        />
      ))}

      {/* Sfondo */}
      <mesh position={[0, -2, -5]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </>
  );
}

export function EmailTransferAnimation3D(props: EmailTransferAnimation3DProps) {
  const { currentFolder } = props;

  return (
    <div className="relative w-full h-full">
      {/* Canvas 3D */}
      <Canvas shadows className="bg-gradient-to-br from-slate-900 to-slate-800">
        <Scene {...props} />
      </Canvas>

      {/* Overlay info cartella corrente */}
      {currentFolder && (
        <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border">
          <p className="text-xs text-muted-foreground">Cartella corrente</p>
          <p className="text-sm font-semibold">{currentFolder}</p>
        </div>
      )}
    </div>
  );
}
