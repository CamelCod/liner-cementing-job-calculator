"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Html } from "@react-three/drei"
import { useMemo } from "react"
import type { SurveyPoint } from "@/lib/td-model"
import { makeCurveFromSurvey, computeWellPath, centerAndScale, toThreePoints } from "@/lib/wellpath"
import { Color } from "three"

export function Well3D({ survey = [] as SurveyPoint[] }) {
  // Build curve and helper arrays
  const { curve, approxRadius } = useMemo(() => makeCurveFromSurvey(survey), [survey])

  // Points for a thin polyline overlay using BufferGeometry (very stable)
  const linePoints = useMemo(() => {
    const wp = computeWellPath(survey)
    const pts = toThreePoints(wp)
    const centered = centerAndScale(pts).points
    // Filter out any invalid vectors defensively
    return centered.filter((v) => isFinite(v.x) && isFinite(v.y) && isFinite(v.z))
  }, [survey])

  // Positions array for BufferGeometry
  const linePositions = useMemo(() => {
    if (!linePoints || linePoints.length < 2) return new Float32Array(0)
    const arr = new Float32Array(linePoints.length * 3)
    for (let i = 0; i < linePoints.length; i++) {
      const p = linePoints[i]
      arr[i * 3 + 0] = p.x
      arr[i * 3 + 1] = p.y
      arr[i * 3 + 2] = p.z
    }
    return arr
  }, [linePoints])

  const tubularSegments = 800
  const radialSegments = 16
  const tubeRadius = useMemo(() => Math.max(approxRadius * 0.012, 0.03), [approxRadius])

  const isPathValid = curve && linePoints.length >= 2 && linePositions.length >= 6

  return (
    <div className="w-full h-screen rounded-md border overflow-hidden bg-white">
      <Canvas camera={{ position: [30, 20, 30], fov: 45 }}>
        <color attach="background" args={["#f7f7f8"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[20, 30, 10]} intensity={0.7} />

        {/* Ground grid for reference */}
        <gridHelper args={[80, 40, new Color("#dadde1"), new Color("#eceff3")]} position={[0, -20, 0]} />

        {/* Tube mesh (thick path) */}
        {isPathValid && (
          <mesh castShadow receiveShadow>
            {/* Build geometry via args so R3F handles lifecycle */}
            {/* @ts-expect-error - curve type is acceptable for TubeGeometry */}
            <tubeGeometry args={[curve, tubularSegments, tubeRadius, radialSegments, false]} />
            <meshStandardMaterial color={"#1f77b4"} roughness={0.6} metalness={0.1} />
          </mesh>
        )}

        {/* Thin polyline overlay using BufferGeometry (avoids LineSegmentsGeometry) */}
        {isPathValid && (
          <line frustumCulled={false}>
            <bufferGeometry>
              {/*
                Using a static positions attribute is safer than constructing Line2/LineSegmentsGeometry.
                This avoids NaN bounding spheres if data updates mid-render.
              */}
              <bufferAttribute
                attach={"attributes-position"}
                array={linePositions}
                count={linePositions.length / 3}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={"#d62728"} />
          </line>
        )}

        {/* Axes helper */}
        <axesHelper args={[10]} />

        <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.08} />
        {!isPathValid && (
          <Html position={[0, 0, 0]} center>
            <div className="rounded-md bg-white/90 px-2 py-1 text-xs shadow border">
              Provide at least two valid survey stations to render 3D path.
            </div>
          </Html>
        )}
      </Canvas>
    </div>
  )
}
