export type SurveyPoint = {
  md: number // ft
  inc: number // degrees
  azi: number // degrees
}

/* ----------------------- Pipes (strings) ----------------------- */
export type PipeSpec = {
  name: string
  od_in: number
  id_in: number
  weight_lbft: number // nominal in air
}

export type ActiveString = "liner" | "dp1" | "dp2"

/* ----------------------- Friction ----------------------- */
export type FrictionSection = {
  fromMD: number
  toMD: number
  mu: number
}

/* ----------------------- Fluids ----------------------- */
export type FluidSpec = {
  name: string
  density_ppg: number
  pv_cp?: number
  yp_lbf100ft2?: number
}

export type FluidProgram = {
  mud: FluidSpec
  displacement: FluidSpec[] // max 3
  spacers: FluidSpec[] // max 3
  cements: FluidSpec[] // max 3
}

export type FluidRef =
  | { kind: "mud" }
  | { kind: "displacement"; index: number }
  | { kind: "spacer"; index: number }
  | { kind: "cement"; index: number }

export type FluidSection = {
  fromMD: number
  toMD: number
  ref: FluidRef
}

/* ----------------------- Scenario ----------------------- */
export type Scenario = {
  name: string
  // strings
  parentCasing: PipeSpec
  liner: PipeSpec
  dp1: PipeSpec
  dp2: PipeSpec
  activeString: ActiveString

  // friction
  mu: number // default
  frictionSections?: FrictionSection[]

  // fluids
  fluids: FluidProgram
  fluidSections?: FluidSection[] // which fluid is present by depth (optional). Default = mud

  // operation/solver targets
  rotate: boolean
  targetSetdown: number // lbf compression at top of liner
  segmentFt: number
}

export type ScenarioResult = {
  scenarioName: string
  targetMD: number
  targetSetdown: number
  surfaceSetdown: number // lbf
  surfaceTorque: number // ft-lbf
  buoyancyFactor: number // reported at target MD (for quick reference)
  w_buoyed: number // lb/ft at target MD
  converged: boolean
  series: { md: number; tension: number; torque: number }[]
}

/* ----------------------- Defaults ----------------------- */
const DEF_PIPE: PipeSpec = { name: "Generic", od_in: 5.5, id_in: 4.5, weight_lbft: 20 }
const DEF_DP1: PipeSpec = { name: 'DP 5" HW', od_in: 5.0, id_in: 3.5, weight_lbft: 19.5 }
const DEF_DP2: PipeSpec = { name: 'DP 3-1/2"', od_in: 3.5, id_in: 2.5, weight_lbft: 13.3 }

const DEF_FLUIDS: FluidProgram = {
  mud: { name: "Mud", density_ppg: 10.0, pv_cp: 20, yp_lbf100ft2: 10 },
  displacement: [
    { name: "Diesel pill", density_ppg: 7.2 },
    { name: "Brine", density_ppg: 9.2 },
    { name: "Spacer Light", density_ppg: 9.5 },
  ],
  spacers: [
    { name: "Spacer 1", density_ppg: 10.0 },
    { name: "Spacer 2", density_ppg: 10.5 },
    { name: "Spacer 3", density_ppg: 11.0 },
  ],
  cements: [
    { name: "Lead cement", density_ppg: 12.5 },
    { name: "Tail cement", density_ppg: 15.8 },
    { name: "Light cement", density_ppg: 11.5 },
  ],
}

export const defaultScenario: Scenario = {
  name: "Scenario",
  parentCasing: { name: 'Parent casing 7"', od_in: 7.0, id_in: 6.1, weight_lbft: 26.0 },
  liner: { ...DEF_PIPE, name: 'Liner 5-1/2"', od_in: 5.5, id_in: 4.5, weight_lbft: 20.0 },
  dp1: DEF_DP1,
  dp2: DEF_DP2,
  activeString: "liner",
  mu: 0.24,
  frictionSections: [],
  rotate: false,
  targetSetdown: 15000,
  segmentFt: 25,
  fluids: DEF_FLUIDS,
  fluidSections: [],
}

/* ----------------------- Survey parsing ----------------------- */
export function parseSurveyCSV(csv: string): SurveyPoint[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const maybeHeader = lines[0]?.toLowerCase?.() ?? ""
  const startIdx = maybeHeader.includes("md") && (maybeHeader.includes("inc") || maybeHeader.includes("incl")) ? 1 : 0

  const out: SurveyPoint[] = []
  for (let idx = startIdx; idx < lines.length; idx++) {
    const parts = lines[idx].split(/[,;\s]+/).filter(Boolean)
    if (parts.length < 3) continue
    const [a, b, c] = parts
    const md = Number(a)
    const inc = Number(b)
    const azi = Number(c)
    if (Number.isFinite(md) && Number.isFinite(inc) && Number.isFinite(azi)) {
      out.push({ md, inc, azi })
    }
  }
  return out.sort((x, y) => x.md - y.md)
}

/* ----------------------- Scenario evaluation ----------------------- */
export function computeScenarioResult({
  survey,
  scenario,
  targetMD,
}: {
  survey: SurveyPoint[]
  scenario: Scenario
  targetMD: number
}): ScenarioResult {
  const clampedTarget = Math.max(Math.min(targetMD, survey[survey.length - 1].md), survey[0].md)

  const muAt = makeMuAt(scenario.mu, scenario.frictionSections)
  const ppgAt = makePPGAt(scenario.fluids, scenario.fluidSections)

  const active = pickActiveString(scenario)
  const r_eff_ft = active.od_in / 2 / 12 // ft

  const wAir = active.weight_lbft

  // Depth-dependent buoyed weight
  const w_buoyed_at = (md: number) => wAir * buoyancyFactorFromPPG(ppgAt(md))

  // Solve
  const targetCompression = scenario.targetSetdown
  const { converged, surfaceForce, series } = solveSurfaceForTarget({
    survey,
    targetMD: clampedTarget,
    segmentFt: scenario.segmentFt,
    muAt,
    w_buoyed_at,
    rotate: scenario.rotate,
    r_eff_ft,
    targetCompression,
  })

  // Report BF and buoyed weight at target for convenience
  const bfTarget = buoyancyFactorFromPPG(ppgAt(clampedTarget))
  const wBuoyedTarget = wAir * bfTarget
  const surfaceTorque = series.length ? series[series.length - 1].torque : 0

  return {
    scenarioName: scenario.name,
    targetMD: clampedTarget,
    targetSetdown: targetCompression,
    surfaceSetdown: surfaceForce,
    surfaceTorque,
    buoyancyFactor: bfTarget,
    w_buoyed: wBuoyedTarget,
    converged,
    series,
  }
}

function pickActiveString(s: Scenario): PipeSpec {
  if (s.activeString === "dp1") return s.dp1
  if (s.activeString === "dp2") return s.dp2
  return s.liner
}

function makeMuAt(defaultMu: number, sections?: FrictionSection[]) {
  const clean = (sections || [])
    .map((s) => ({
      fromMD: Math.min(s.fromMD, s.toMD),
      toMD: Math.max(s.fromMD, s.toMD),
      mu: s.mu,
    }))
    .filter((s) => Number.isFinite(s.fromMD) && Number.isFinite(s.toMD) && Number.isFinite(s.mu))
    .sort((a, b) => a.fromMD - b.fromMD)

  return (md: number) => {
    for (const s of clean) {
      if (md >= s.fromMD && md <= s.toMD) return s.mu
    }
    return defaultMu
  }
}

function makePPGAt(program: FluidProgram, sections?: FluidSection[]) {
  const clampIdx = (arr: any[], i: number) => Math.max(0, Math.min(arr.length - 1, i))
  const clean = (sections || [])
    .map((sec) => ({
      fromMD: Math.min(sec.fromMD, sec.toMD),
      toMD: Math.max(sec.fromMD, sec.toMD),
      ref: sec.ref,
    }))
    .filter((s) => Number.isFinite(s.fromMD) && Number.isFinite(s.toMD))
    .sort((a, b) => a.fromMD - b.fromMD)

  const ppgOfRef = (ref: FluidRef): number => {
    switch (ref.kind) {
      case "mud":
        return program.mud.density_ppg
      case "displacement":
        return program.displacement[clampIdx(program.displacement, ref.index)]?.density_ppg ?? program.mud.density_ppg
      case "spacer":
        return program.spacers[clampIdx(program.spacers, ref.index)]?.density_ppg ?? program.mud.density_ppg
      case "cement":
        return program.cements[clampIdx(program.cements, ref.index)]?.density_ppg ?? program.mud.density_ppg
    }
  }

  return (md: number) => {
    for (const s of clean) {
      if (md >= s.fromMD && md <= s.toMD) return ppgOfRef(s.ref)
    }
    return program.mud.density_ppg
  }
}

/**
 * Soft-string, distributed friction model with depth-dependent buoyancy and μ
 */
function simulateSlackOffProfile(params: {
  survey: SurveyPoint[]
  toMD: number
  segmentFt: number
  muAt: (md: number) => number
  w_buoyed_at: (md: number) => number
  rotate: boolean
  r_eff_ft: number
  surfaceForce: number
}) {
  const { survey, toMD, segmentFt, muAt, w_buoyed_at, rotate, r_eff_ft, surfaceForce } = params
  const path = discretizeSurvey(survey, segmentFt, toMD)
  let F = surfaceForce
  let M = 0
  const series: { md: number; tension: number; torque: number }[] = [{ md: path[0].md, tension: F, torque: M }]

  for (let i = 1; i < path.length; i++) {
    const mdMid = 0.5 * (path[i - 1].md + path[i].md)
    const ds = path[i].md - path[i - 1].md
    const inc = deg2rad(path[i].inc)
    const w_buoyed = w_buoyed_at(mdMid)
    const g_per_len = w_buoyed * Math.cos(inc)
    const n_per_len = w_buoyed * Math.sin(inc)
    const mu = muAt(mdMid)
    const f_per_len = mu * n_per_len

    F += (g_per_len + f_per_len) * ds
    if (rotate) {
      M += f_per_len * r_eff_ft * ds
    }

    series.push({ md: path[i].md, tension: F, torque: M })
  }

  return { series, forceAtTarget: series[series.length - 1].tension }
}

function solveSurfaceForTarget(params: {
  survey: SurveyPoint[]
  targetMD: number
  segmentFt: number
  muAt: (md: number) => number
  w_buoyed_at: (md: number) => number
  rotate: boolean
  r_eff_ft: number
  targetCompression: number
}) {
  const { survey, targetMD, segmentFt, muAt, w_buoyed_at, rotate, r_eff_ft, targetCompression } = params

  const targetForceAtMD = -Math.abs(targetCompression)

  let lo = 0
  let hi = 1_000_000
  let bestSeries: { md: number; tension: number; torque: number }[] = []
  let bestF = hi

  for (let k = 0; k < 60; k++) {
    const mid = 0.5 * (lo + hi)
    const { series, forceAtTarget } = simulateSlackOffProfile({
      survey,
      toMD: targetMD,
      segmentFt,
      muAt,
      w_buoyed_at,
      rotate,
      r_eff_ft,
      surfaceForce: mid,
    })
    if (forceAtTarget > targetForceAtMD) hi = mid
    else lo = mid
    bestSeries = series
    bestF = mid
    if (Math.abs(forceAtTarget - targetForceAtMD) < 1e-3) break
  }

  return { converged: true, surfaceForce: bestF, series: bestSeries }
}

/* ----------------------- Helpers ----------------------- */
function discretizeSurvey(survey: SurveyPoint[], stepFt: number, toMD: number) {
  const sorted = [...survey].sort((a, b) => a.md - b.md)
  const startMD = sorted[0].md
  const endMD = Math.min(toMD, sorted[sorted.length - 1].md)
  const path: { md: number; inc: number }[] = []

  let md = startMD
  while (md < endMD - 1e-9) {
    const inc = interpAtMD(sorted, md).inc
    path.push({ md, inc })
    md = Math.min(md + stepFt, endMD)
  }
  path.push({ md: endMD, inc: interpAtMD(sorted, endMD).inc })
  return path
}

function interpAtMD(survey: SurveyPoint[], md: number) {
  if (md <= survey[0].md) return survey[0]
  if (md >= survey[survey.length - 1].md) return survey[survey.length - 1]
  let i = 1
  while (i < survey.length && survey[i].md < md) i++
  const a = survey[i - 1]
  const b = survey[i]
  const t = (md - a.md) / (b.md - a.md)
  return {
    md,
    inc: a.inc + (b.inc - a.inc) * t,
    azi: a.azi + (b.azi - a.azi) * t,
  }
}

function deg2rad(d: number) {
  return (d * Math.PI) / 180
}

// Oilfield approximation: buoyancy factor BF = 1 - (mud_ppg / 65.4)
export function buoyancyFactorFromPPG(mud_ppg: number) {
  return 1 - mud_ppg / 65.4
}

/* ----------------------- Sample survey ----------------------- */
export const SAMPLE_SURVEY_CSV = `md,inc,azi
0,0,0
1000,0,0
2000,10,45
3000,30,45
4000,60,90
5000,85,90
6000,90,90
7000,90,90
8000,90,90
9000,90,90
10000,90,90
11000,90,90
12000,90,90
`
