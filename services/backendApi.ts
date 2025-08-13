/**
 * Backend API client for Python FastAPI cementing microservice.
 * Thin wrapper around /calculate endpoint with adapter to legacy Calculations format.
 */
import type { PipeConfig, MudConfig, HoleOverlapConfig, Calculations, PlotConfig, TorqueDragResult } from '../types';

export interface BackendCalcResponse {
  cementVolume: number;
  mudPPG: number;
  annulusAreaFt2: number;
}

export interface BackendCalcPayload {
  casing: any;
  liner: any;
  dp1: any;
  dp2?: any;
  mud: { ppg: number };
  holeOverlap: { openHoleId: number; linerOverlap: number; shoeTrackLength: number };
}

const num = (v?: string) => parseFloat(v || '0') || 0;

function basePipe(p: PipeConfig) {
  return { od: num(p.od), id: num(p.id), wt: num(p.wt), length: num(p.length), md: num(p.md), tvd: num(p.tvd), grade: p.grade || '' };
}

export function buildBackendPayload(params: {
  casing: PipeConfig; liner: PipeConfig; dp1: PipeConfig; dp2: PipeConfig; dpConfig: 'single' | 'dual';
  mud: MudConfig; holeOverlap: HoleOverlapConfig;
}): BackendCalcPayload {
  const { casing, liner, dp1, dp2, dpConfig, mud, holeOverlap } = params;
  return {
    casing: basePipe(casing),
    liner: basePipe(liner),
    dp1: basePipe(dp1),
    dp2: dpConfig === 'dual' ? basePipe(dp2) : undefined,
    mud: { ppg: num(mud.ppg) },
    holeOverlap: {
      openHoleId: num(holeOverlap.openHoleId),
      linerOverlap: num(holeOverlap.linerOverlap),
      shoeTrackLength: num(holeOverlap.shoeTrackLength)
    }
  };
}

// Minimal adapter placeholder until backend reaches full parity with enhanced engine.
export function adaptBackendResultToCalculations(resp: BackendCalcResponse, ctx: {
  wellName: string; jobDate: string; previousPlots?: PlotConfig[]; previousTorqueDrag?: TorqueDragResult | null;
}): Calculations {
  return {
    keyCalculations: {},
    cementForceCalcs: { table: [] },
    jobSummary: { wellName: ctx.wellName, date: ctx.jobDate, linerTopDepth: 0, linerShoeDepth: 0, linerLength: 0 },
    keyResults: {
      initialHookload: 0,
      hookloadWithSF: 0,
      postCementHookload: 0,
      drillStringStretch: 0,
      netForceOnLinerHanger: 0,
      netForceWithSF: 0,
      requiredCementVolume: resp.cementVolume,
      uTubePressureDifferential: 0,
      criticalPumpRate: 0
    },
    safetyStatus: { hookloadStatus: 'OK', netForceStatus: 'N/A', stretchStatus: '0 in' },
    buoyancyAndWeight: { mudBuoyancyFactor: 0, spacerBuoyancyFactor: 0, cementBuoyancyFactor: 0, linerAirWeight: 0, linerBuoyedWeight: 0, dpAirWeight: 0, dpBuoyedWeight: 0 },
    volumeCalcs: { linerCapacity: 0, dpCapacity: 0, annulusVolume: resp.annulusAreaFt2, totalCementRequired: resp.cementVolume, stringDisplacement: 0 },
    hydrostaticPressure: { mudPressureAtLinerTop: 0, mudPressureAtLinerShoe: 0, cementPressureAtLinerTop: 0, cementPressureAtLinerShoe: 0 },
    hookloadCalcs: { initialHookload: 0, hookloadWithSF: 0, postCementHookload: 0 },
    stretchCalcs: { setdownForce: 0, totalLoadOnDrillString: 0, drillStringCrossSection: 0, stretchDueToLoad: 0, stretchInFeet: 0 },
    forceAnalysis: { downwardForceLinerWeight: 0, downwardForceSetdown: 0, upwardForceCementBuoyancy: 0, netDownwardForce: 0, netForceWithSF: 0 },
    uTubeEffect: { pressureDiffAtSurface: 0, criticalPumpRate: 0 },
    volumes: { cementVolume: resp.cementVolume, displacementVolume: 0, plugDrop: 0, totalWellVolume: 0, linerDisplacementVolume: 0, surfaceToShoe: 0 },
    operations: { waitOnCement: 0, cementTravelTime: 0, circulationRate: 0 },
    keyVolumes: [],
    cementForces: null,
    plots: ctx.previousPlots || [],
    torqueDragResult: ctx.previousTorqueDrag || null,
    torqueDragRotate: ctx.previousTorqueDrag || null,
    torqueDragNoRotate: null
  };
}

export async function callBackendCalculation(payload: BackendCalcPayload, signal?: AbortSignal): Promise<BackendCalcResponse> {
  const baseUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:8001';
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: signal ?? null
  } as RequestInit);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function runBackendCalculation(params: {
  casing: PipeConfig; liner: PipeConfig; dp1: PipeConfig; dp2: PipeConfig; dpConfig: 'single' | 'dual';
  mud: MudConfig; holeOverlap: HoleOverlapConfig; wellName: string; jobDate: string;
  previousPlots?: PlotConfig[]; previousTorqueDrag?: TorqueDragResult | null;
}): Promise<Calculations> {
  const payload = buildBackendPayload(params);
  const resp = await callBackendCalculation(payload);
  return adaptBackendResultToCalculations(resp, {
    wellName: params.wellName,
    jobDate: params.jobDate,
    previousPlots: params.previousPlots || [],
    previousTorqueDrag: params.previousTorqueDrag ?? null
  });
}
