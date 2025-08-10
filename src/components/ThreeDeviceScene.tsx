// src/shared/ThreeDeviceScene.tsx
import { useRef, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

type Props = { trigger: any | null };

function PulsingSphere({ trigger }: { trigger: any | null }) {
  const mesh = useRef<any>(undefined);
  const scaleRef = useRef(1.4); // idle smaller
  const lastTriggerId = useRef<string | number | null>(null);
  const idleScale = 1.4;

  // ⬇ This is where the texture is loaded
  const texture = useLoader(THREE.TextureLoader, "/textures/earth.jpg");

  useFrame((_, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.4;
      mesh.current.scale.lerp({ x: scaleRef.current, y: scaleRef.current, z: scaleRef.current }, 0.1);

      if (Math.abs(scaleRef.current - idleScale) < 0.01) {
        scaleRef.current = idleScale;
      }
    }
  });

  useEffect(() => {
    if (!trigger) return;
    const id = trigger.id || trigger.ts || JSON.stringify(trigger);
    if (id === lastTriggerId.current) return;
    lastTriggerId.current = id;

    scaleRef.current = 1; // pulse bigger
    const t = setTimeout(() => (scaleRef.current = idleScale), 600);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <mesh ref={mesh} position={[0, 0, 0]}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial
        map={texture} // ⬅ And this is where it's used on the sphere
        emissive={trigger ? "#ff8a50" : "#8eeaf2"}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

export default function ThreeDeviceScene({ trigger }: Props) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <directionalLight position={[-5, -5, -5]} intensity={0.6} />
        <PulsingSphere trigger={trigger} />
      </Canvas>
    </div>
  );
}
