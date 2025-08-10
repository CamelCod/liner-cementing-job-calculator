import type { SurveyPoint } from "@/lib/td-model"
import { Vector3, CatmullRomCurve3 } from "three"

/**
 * Minimum Curvature method to convert MD/Inc/Azi to 3D coordinates (E, N, TVD).
 * - Inc, Azi in degrees; TVD positive downward.
 * - Returns points starting at (0,0,0) for the first survey station.
 * References: standard directional drilling formulas; adapted to TS for browser use.
 */
export function computeWellPath(survey: SurveyPoint[]) {
  if (!survey.length) return [] as { md: number; x: number; y: number; z: number }[]
  const s = [...survey].sort((a, b) => a.md - b.md)
  const out: { md: number; x: number; y: number; z: number }[] = []
  let E = 0
  let N = 0
  let TVD = 0
  out.push({ md: s[0].md, x: E, y: N, z: TVD })

  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i]
    const b = s[i + 1]
    const dMD = b.md - a.md
    if (dMD <= 0) continue

    const inc1 = deg2rad(a.inc)
    const inc2 = deg2rad(b.inc)
    const azi1 = deg2rad(a.azi)
    const azi2 = deg2rad(b.azi)

    const cosDL = Math.sin(inc1) * Math.sin(inc2) * Math.cos(azi2 - azi1) + Math.cos(inc1) * Math.cos(inc2)
    const dl = clamp(Math.acos(clamp(cosDL, -1, 1)), 0, Math.PI)
    const rf = dl > 1e-12 ? (2 / dl) * Math.tan(dl / 2) : 1

    const dN = (dMD / 2) * (Math.sin(inc1) * Math.cos(azi1) + Math.sin(inc2) * Math.cos(azi2)) * rf
    const dE = (dMD / 2) * (Math.sin(inc1) * Math.sin(azi1) + Math.sin(inc2) * Math.sin(azi2)) * rf
    const dTVD = (dMD / 2) * (Math.cos(inc1) + Math.cos(inc2)) * rf

    N += dN
    E += dE
    TVD += dTVD
    out.push({ md: b.md, x: E, y: N, z: TVD })
  }
  return out
}

export function toThreePoints(path: { x: number; y: number; z: number }[]) {
  return path.map((p) => new Vector3(p.x, p.y, p.z))
}

export function centerAndScale(points: Vector3[]) {
  if (!points.length) return { points, center: new Vector3(), scale: 1, radius: 1 }
  const min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)
  const max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)
  for (const p of points) {
    min.min(p)
    max.max(p)
  }
  const center = min.clone().add(max).multiplyScalar(0.5)
  const size = max.clone().sub(min)
  const maxDim = Math.max(size.x, size.y, size.z, 1)
  // Scale to a comfortable view: fit largest dimension to ~20 world units
  const desired = 20
  const scale = maxDim > 0 ? desired / maxDim : 1
  const scaled = points.map((p) => p.clone().sub(center).multiplyScalar(scale))
  const radius = 0.5 * maxDim * scale
  return { points: scaled, center: new Vector3(0, 0, 0), scale, radius }
}

function deg2rad(d: number) {
  return (d * Math.PI) / 180
}
function clamp(v: number, a: number, b: number) {
  return Math.min(Math.max(v, a), b)
}

/**
 * Build a smooth Tube curve for 3D rendering.
 */
export function makeCurveFromSurvey(survey: SurveyPoint[]) {
  const path = computeWellPath(survey)
  const pts = toThreePoints(path)
  const { points, radius } = centerAndScale(pts)
  const curve = new CatmullRomCurve3(points, false, "centripetal", 0.5)
  return { curve, approxRadius: radius }
}
