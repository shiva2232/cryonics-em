// src/shared/ThreeDeviceScene.tsx
import { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

type Props = { trigger: any | null };

function PulsingSphere({ trigger }: { trigger: any | null }) {
  const mesh = useRef<any>(undefined);
  const scaleRef = useRef(1);
  const lastTriggerId = useRef<string | number | null>(null);

  useFrame((_, delta) => {
    if (mesh.current) {
      // continuous slow rotation
      mesh.current.rotation.y += delta * 0.4;
      // smooth scale interpolation
      const target = scaleRef.current;
      mesh.current.scale.lerp({ x: target, y: target, z: target }, 0.1);
      // relax toward 1
      if (Math.abs(target - 1) < 0.01) scaleRef.current = 1;
    }
  });

  // pulse whenever trigger changes
  useEffect(() => {
    if (!trigger) return;
    const id = trigger.id || trigger.ts || JSON.stringify(trigger);
    if (id === lastTriggerId.current) return;
    lastTriggerId.current = id;
    scaleRef.current = 1.8; // pulse
    // reduce after time
    const t = setTimeout(() => (scaleRef.current = 1), 600);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <mesh ref={mesh} position={[0,0,0]}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial color={trigger ? "#ff5722" : "#06b6d4"} emissive={trigger ? "#ff8a50" : "#8eeaf2"} emissiveIntensity={0.6} />
    </mesh>
  );
}

export default function ThreeDeviceScene({ trigger }: Props) {
  // fixed canvas size responsive
  return (
    <div style={{ width: "100%", height: 240 }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5,5,5]} intensity={0.6} />
        <PulsingSphere trigger={trigger} />
      </Canvas>
    </div>
  );
}
