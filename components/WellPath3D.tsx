import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Grid } from '@react-three/drei';

type Svy = { md: number; tvd: number; incl: number };

function polylineFromSurvey(svy: Svy[]) {
  // Build a 3D path with X as lateral accumulated from inclination, Y as TVD, Z as 0 (no azi provided)
  let x = 0;
  const points: [number, number, number][] = [];
  const sorted = [...svy].sort((a, b) => a.md - b.md);
  if (sorted.length) points.push([0, -sorted[0].tvd || 0, 0]);
  for (let i = 1; i < sorted.length; i++) {
    const ds = sorted[i].md - sorted[i - 1].md;
    const incRad = (sorted[i].incl * Math.PI) / 180;
    const dVert = Math.cos(incRad) * ds;
    const dLat = Math.sin(incRad) * ds;
    x += dLat;
    const y = -(sorted[i - 1].tvd + dVert);
    points.push([x, y, 0]);
  }
  return points;
}

const PathLine: React.FC<{ points: [number, number, number][], color?: string }>
  = ({ points, color = '#2563eb' }) => {
  return <Line points={points} color={color} lineWidth={2} />;
};

const GridFloor: React.FC = () => (
  <Grid infiniteGrid cellSize={100} sectionSize={1000} fadeDistance={1500} />
);

const WellPath3D: React.FC<{ survey: Svy[] }>= ({ survey }) => {
  const pts = useMemo(() => polylineFromSurvey(survey), [survey]);
  return (
    <div className="w-full h-[360px] rounded-xl overflow-hidden bg-[#0a0f14]">
      <Canvas camera={{ position: [500, -500, 800], fov: 45 }}>
        <ambientLight />
        <directionalLight />
        <Suspense fallback={null}>
          <GridFloor />
          {pts.length > 1 && <PathLine points={pts} />}
        </Suspense>
        <OrbitControls enablePan enableRotate enableZoom />
      </Canvas>
    </div>
  );
};

export default WellPath3D;
