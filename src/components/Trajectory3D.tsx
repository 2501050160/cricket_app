import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Line, Sphere, Float, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import React, { useMemo, useEffect, useRef, Suspense } from 'react';
import { 
  TrajectoryPoint, 
  PITCH_LENGTH, 
  STUMP_HEIGHT, 
  STUMP_WIDTH, 
  STUMP_RADIUS, 
  BAIL_HEIGHT 
} from '../services/physics';

interface Trajectory3DProps {
  points: TrajectoryPoint[];
  predictions: TrajectoryPoint[];
  impactPoint?: { x: number; y: number; z: number };
  currentTime?: number;
  viewMode?: 'umpire' | 'leg' | 'top' | 'free';
  isDecisionSequence?: boolean;
  impactData?: {
    pitching: string;
    impact: string;
    wickets: string;
  };
}

const CameraController = ({ mode, controlsRef, isDecisionSequence }: { mode: string, controlsRef: React.RefObject<any>, isDecisionSequence?: boolean }) => {
  const { camera } = useThree();
  const [currentMode, setCurrentMode] = React.useState(mode);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);
  
  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    
    switch (currentMode) {
      case 'umpire':
        camera.position.set(0, 2.5, -8);
        controls.target.set(0, 1, PITCH_LENGTH / 2);
        break;
      case 'leg':
        camera.position.set(12, 1.5, PITCH_LENGTH / 2);
        controls.target.set(0, 1, PITCH_LENGTH / 2);
        break;
      case 'top':
        camera.position.set(0, 25, PITCH_LENGTH / 2);
        controls.target.set(0, 1, PITCH_LENGTH / 2);
        break;
    }
    controls.update();
  }, [currentMode, camera, controlsRef]);

  return null;
};

const BroadcastOverlay = ({ data, visible }: { data?: Trajectory3DProps['impactData'], visible: boolean }) => {
  if (!visible || !data) return null;

  return (
    <div className="absolute left-6 bottom-24 z-20 space-y-2 pointer-events-none">
      <div className="flex flex-col">
        <div className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-tighter w-32">Pitching</div>
        <div className={`px-3 py-1 text-white text-xs font-bold uppercase w-32 ${data.pitching.includes('OUTSIDE') ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {data.pitching}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-tighter w-32">Impact</div>
        <div className={`px-3 py-1 text-white text-xs font-bold uppercase w-32 ${data.impact.includes('IN-LINE') ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {data.impact}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-tighter w-32">Wickets</div>
        <div className={`px-3 py-1 text-white text-xs font-bold uppercase w-32 ${data.wickets.includes('HITTING') ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {data.wickets}
        </div>
      </div>
    </div>
  );
};

const Stadium = () => {
  // Using a stadium crowd texture
  const crowdTexture = useTexture('https://picsum.photos/seed/crowd/1024/512');
  crowdTexture.wrapS = crowdTexture.wrapT = THREE.RepeatWrapping;
  crowdTexture.repeat.set(8, 1);

  const grassTexture = useTexture('https://picsum.photos/seed/cricketgrass/1024/1024');
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(10, 10);

  return (
    <group>
      {/* Sky/Atmosphere - Dark blue gradient feel */}
      <mesh scale={[150, 150, 150]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#020408" side={THREE.BackSide} />
      </mesh>

      {/* Lower Tier Stands */}
      <mesh position={[0, 8, PITCH_LENGTH / 2]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[65, 55, 16, 64, 1, true]} />
        <meshStandardMaterial 
          map={crowdTexture} 
          side={THREE.BackSide} 
          roughness={1}
          metalness={0.1}
        />
      </mesh>

      {/* Upper Tier Stands */}
      <mesh position={[0, 24, PITCH_LENGTH / 2]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[75, 65, 16, 64, 1, true]} />
        <meshStandardMaterial 
          map={crowdTexture} 
          side={THREE.BackSide} 
          roughness={1}
          metalness={0.1}
          color="#888" // Slightly darker for distance
        />
      </mesh>

      {/* Roof/Canopy */}
      <mesh position={[0, 32, PITCH_LENGTH / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[65, 80, 64]} />
        <meshStandardMaterial color="#222" side={THREE.DoubleSide} />
      </mesh>

      {/* Grass Outfield with Mowing Patterns */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, PITCH_LENGTH / 2]}>
        <circleGeometry args={[55, 64]} />
        <meshStandardMaterial 
          map={grassTexture} 
          roughness={0.9} 
          color="#2d5a27"
        />
      </mesh>

      {/* Boundary Rope */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, PITCH_LENGTH / 2]}>
        <torusGeometry args={[52, 0.3, 16, 100]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Scoreboard / Big Screen */}
      <group position={[0, 20, PITCH_LENGTH / 2 + 70]} rotation={[0, Math.PI, 0]}>
        <mesh>
          <boxGeometry args={[30, 15, 1]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0, 0, 0.6]}>
          <planeGeometry args={[28, 13]} />
          <meshBasicMaterial color="#000" />
        </mesh>
      </group>

      {/* Floodlight Towers */}
      {[
        [60, 40, -40],
        [-60, 40, -40],
        [60, 40, PITCH_LENGTH + 40],
        [-60, 40, PITCH_LENGTH + 40]
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          {/* Tower Pole */}
          <mesh position={[0, -20, 0]}>
            <cylinderGeometry args={[1, 1.5, 40]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          {/* Light Panel */}
          <group position={[0, 0, 0]}>
            <mesh rotation={[0.5, 0, 0]}>
              <boxGeometry args={[8, 6, 1]} />
              <meshStandardMaterial color="#222" />
            </mesh>
            {/* Actual Lights */}
            <mesh position={[0, 0, 0.6]} rotation={[0.5, 0, 0]}>
              <planeGeometry args={[7, 5]} />
              <meshBasicMaterial color="#fff" />
            </mesh>
            <spotLight 
              intensity={3} 
              distance={150} 
              angle={0.6} 
              penumbra={0.3} 
              position={[0, 0, 0]} 
              target-position={[0, 0, PITCH_LENGTH / 2]}
            />
          </group>
        </group>
      ))}
    </group>
  );
};

const Wicket = ({ isHit, currentTime = 0 }: { isHit?: boolean, currentTime?: number }) => {
  const stumpGeometry = useMemo(() => new THREE.CylinderGeometry(STUMP_RADIUS, STUMP_RADIUS, STUMP_HEIGHT, 16), []);
  const bailGeometry = useMemo(() => new THREE.CylinderGeometry(0.005, 0.005, STUMP_WIDTH / 2, 8), []);
  
  const leftBailRef = useRef<THREE.Mesh>(null);
  const rightBailRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Animation starts near the end of the trajectory if it's a hit
    const hitTriggered = isHit && currentTime > 95;
    
    if (hitTriggered) {
      if (leftBailRef.current) {
        leftBailRef.current.position.y += 0.02;
        leftBailRef.current.position.z += 0.01;
        leftBailRef.current.rotation.x += 0.1;
        leftBailRef.current.rotation.z += 0.05;
      }
      if (rightBailRef.current) {
        rightBailRef.current.position.y += 0.025;
        rightBailRef.current.position.z += 0.015;
        rightBailRef.current.rotation.x -= 0.08;
        rightBailRef.current.rotation.y += 0.1;
      }
    } else {
      // Reset positions if not hit or time reset
      if (leftBailRef.current) {
        leftBailRef.current.position.set(STUMP_WIDTH / 4, STUMP_HEIGHT + BAIL_HEIGHT / 2, 0);
        leftBailRef.current.rotation.set(0, 0, Math.PI / 2);
      }
      if (rightBailRef.current) {
        rightBailRef.current.position.set(-STUMP_WIDTH / 4, STUMP_HEIGHT + BAIL_HEIGHT / 2, 0);
        rightBailRef.current.rotation.set(0, 0, Math.PI / 2);
      }
    }
  });
  
  return (
    <group position={[0, 0, PITCH_LENGTH]}>
      {/* Off Stump */}
      <mesh geometry={stumpGeometry} position={[STUMP_WIDTH / 2, STUMP_HEIGHT / 2, 0]}>
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={isHit && currentTime > 95 ? 2 : 0.2} />
      </mesh>
      {/* Middle Stump */}
      <mesh geometry={stumpGeometry} position={[0, STUMP_HEIGHT / 2, 0]}>
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={isHit && currentTime > 95 ? 2 : 0.2} />
      </mesh>
      {/* Leg Stump */}
      <mesh geometry={stumpGeometry} position={[-STUMP_WIDTH / 2, STUMP_HEIGHT / 2, 0]}>
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={isHit && currentTime > 95 ? 2 : 0.2} />
      </mesh>
      
      {/* Bails */}
      <mesh ref={leftBailRef} geometry={bailGeometry}>
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={isHit && currentTime > 95 ? 1 : 0.1} />
      </mesh>
      <mesh ref={rightBailRef} geometry={bailGeometry}>
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={isHit && currentTime > 95 ? 1 : 0.1} />
      </mesh>
    </group>
  );
};

const Pitch = () => {
  const grassTexture = useTexture('https://picsum.photos/seed/grass/512/512');
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(20, 20);

  return (
    <group>
      {/* Main Pitch Area (The Strip) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, PITCH_LENGTH / 2]}>
        <planeGeometry args={[3.05, PITCH_LENGTH + 4]} />
        <meshStandardMaterial color="#d2b48c" roughness={1} />
      </mesh>
      
      {/* Crease Lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, PITCH_LENGTH - 1.22]}>
        <planeGeometry args={[3.05, 0.08]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.22]}>
        <planeGeometry args={[3.05, 0.08]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
};

const BallTrajectory = ({ points, predictions, impactPoint, currentTime = 0 }: Trajectory3DProps) => {
  const ballRef = useRef<THREE.Mesh>(null);
  
  // Reveal tracked path as ball moves
  const visiblePathPoints = useMemo(() => {
    if (points.length === 0) return [];
    const totalDuration = points[points.length - 1].t;
    const targetT = (currentTime / 100) * totalDuration;
    return points
      .filter(p => p.t <= targetT)
      .map(p => new THREE.Vector3(p.x, p.y, p.z));
  }, [points, currentTime]);

  // Reveal predicted path only after ball reaches end of tracked path (near 100% progress)
  const visiblePredPoints = useMemo(() => {
    if (predictions.length === 0 || currentTime < 95) return [];
    return predictions.map(p => new THREE.Vector3(p.x, p.y, p.z));
  }, [predictions, currentTime]);

  // Find the point closest to current time for the ball sphere
  const currentPos = useMemo(() => {
    if (points.length === 0) return null;
    const totalDuration = points[points.length - 1].t;
    const targetT = (currentTime / 100) * totalDuration;
    
    let closest = points[0];
    for (const p of points) {
      if (Math.abs(p.t - targetT) < Math.abs(closest.t - targetT)) {
        closest = p;
      }
    }
    return closest;
  }, [points, currentTime]);

  useFrame((state) => {
    if (ballRef.current) {
      // Add spin to the ball
      ballRef.current.rotation.x += 0.2;
      ballRef.current.rotation.y += 0.1;
      
      // If we are at the end of the tracked path, animate the ball along the prediction
      if (currentTime >= 98 && predictions.length > 0) {
        const t = (state.clock.getElapsedTime() * 2) % 1; // Loop prediction animation
        const index = Math.floor(t * (predictions.length - 1));
        const p = predictions[index];
        ballRef.current.position.set(p.x, p.y, p.z);
        ballRef.current.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.1); // Pulsing effect
      } else if (currentPos) {
        ballRef.current.position.set(currentPos.x, currentPos.y, currentPos.z);
        ballRef.current.scale.setScalar(1);
      }
    }
  });

  return (
    <group>
      {/* Tracked Path - revealed as ball moves */}
      {visiblePathPoints.length > 1 && (
        <Line 
          points={visiblePathPoints} 
          color="#3b82f6" 
          lineWidth={3} 
        />
      )}
      
      {/* Predicted Path - shown at the end */}
      {visiblePredPoints.length > 1 && (
        <Line 
          points={visiblePredPoints} 
          color="#3b82f6" 
          lineWidth={2} 
          dashed 
          dashScale={50}
          dashSize={0.5}
          gapSize={0.5}
        />
      )}

      {/* Animated Ball Position */}
      <Sphere ref={ballRef} args={[0.036, 16, 16]}>
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
      </Sphere>

      {/* Impact Point Marker (Only show if ball has reached or passed impact) */}
      {impactPoint && (currentTime > 80) && (
        <Sphere position={[impactPoint.x, impactPoint.y, impactPoint.z]} args={[0.04, 16, 16]}>
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1} />
        </Sphere>
      )}
    </group>
  );
};

export const Trajectory3D: React.FC<Trajectory3DProps> = ({ viewMode = 'umpire', impactData, isDecisionSequence, ...props }) => {
  const controlsRef = useRef<any>(null);

  return (
    <div className="w-full h-[600px] bg-zinc-950 rounded-2xl border border-white/5 overflow-hidden relative group">
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-2">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400">Hawk-Eye Broadcast View</span>
        </div>
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-white">Live Data Feed</span>
        </div>
      </div>

      <BroadcastOverlay data={impactData} visible={props.currentTime ? props.currentTime > 90 : false} />
      
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {['umpire', 'leg', 'top', 'free'].map((m) => (
          <button 
            key={m}
            className={`px-3 py-1 rounded text-[9px] uppercase font-bold tracking-widest transition-all ${viewMode === m ? 'bg-blue-600 text-white' : 'bg-black/60 text-zinc-400 hover:bg-black/80'}`}
          >
            {m}
          </button>
        ))}
      </div>

      <Canvas shadows>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 3, -8]} fov={45} />
          <OrbitControls 
            ref={controlsRef}
            enableDamping 
            dampingFactor={0.05} 
            target={[0, 1, PITCH_LENGTH / 2]}
            maxPolarAngle={Math.PI / 2}
            minDistance={2}
            maxDistance={30}
            enableZoom={true}
            zoomSpeed={1.2}
          />
          <CameraController mode={viewMode} controlsRef={controlsRef} isDecisionSequence={isDecisionSequence} />
          
          <ambientLight intensity={0.4} />
          
          <Stadium />
          
          <group rotation={[0, 0, 0]}>
            <Pitch />
            <Wicket isHit={impactData?.wickets.includes('HITTING')} currentTime={props.currentTime} />
            <BallTrajectory {...props} />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
};
