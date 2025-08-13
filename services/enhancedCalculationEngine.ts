/* cSpell:words hookload setdown Hookload HWDP */
/**
 * Enhanced Liner Cementing Calculation Engine
 * Implements PRD specifications with bottom-up cement distribution,
 * plug logic, and comprehensive engineering calculations
 */

import type { PipeConfig, Fluid, MudConfig, HoleOverlapConfig } from '../types';

// ============================================================================
// PRD-COMPLIANT TYPE DEFINITIONS
// ============================================================================

export interface PlugForceResults {
  plugAreaSqIn: number;
  hydrostaticPsi: number;
  plugForceLbs: number;
  shearCapacityLbs: number;
  bumpForceLbs: number;
  bumpMarginLbs: number;
  safetyFactor: number;
}

// New: Plug travel / dart sequence results (Abu Dhabi procedure integration)
export interface PlugTravelResults {
  dartLaunchVolumeBbl: number;   // Planned volume when dart is launched
  latchMd: number;               // MD where dart latches into main plug (assumed top of liner)
  shearSuccess: boolean;         // Whether dart volume reached point to shear
  bumpVolumeBbl: number;         // Volume displaced after latch (pumped displacement)
  bumpReached: boolean;          // Whether sufficient volume pumped to bump
  bumpForceLbs: number;          // Force at bump from plug force model
  bumpSafetyFactor: number;      // Safety factor at bump
}

export interface DisplacementResults {
  spacerVolumeBbl: number;
  displacementVolumeBbl: number;
  totalDisplacementBbl: number;
  pipeStringVolumeBbl: number;
  hookloadLbs: number;
  pipeWeightLbs: number;
  fluidWeightLbs: number;
  buoyancyLbs: number;
}

export interface EnhancedCalculationResults {
  // Executive Summary
  jobStatus: 'success' | 'warning' | 'failure';
  warnings: string[];
  tocMd: number;
  tocTvd: number;
  tocAboveLinerShoeFt: number;
  
  // Cement Distribution
  cementSegments: CementSegment[];
  totalCementVolumeBbl: number;
  placedCementVolumeBbl: number;
  excessCementBbl: number;
  cementUtilization: number;
  
  // Forces and Safety
  plugForces: PlugForceResults;
  plugTravel: PlugTravelResults; // New output block
  displacement: DisplacementResults;
  rigCapacityMarginLbs: number;
  factoredHookloadLbs?: number; // Hookload after safety factor (exposed for UI transparency)
  forceMarginPct: number;
  
  // Geometric Calculations
  geometry: GeometricLengths;
  capacities: Capacities;
  
  // Input Echo (for verification)
  inputs: PRDInputs;
  
  // Calculation Metadata
  calculationTimestamp: string;
  prdVersion: string;
  calculationMethod: string;
}

// ============================================================================
// CONSTANTS & CORE FORMULAS (Per PRD Section 3)
// ============================================================================

const STEEL_YOUNGS_MODULUS = 30e6; // psi
const PSI_PER_FT_FACTOR = 0.052;
const FLOATING_POINT_TOLERANCE = 1e-6;

// Core helper formulas as specified in PRD
export const bblPerFt = (outerInch: number, innerInch: number = 0): number => {
  return (Math.pow(outerInch, 2) - Math.pow(innerInch, 2)) / 1029.4;
};

// Clear wrapper functions to avoid parameter order confusion
export const bblPerFtInternal = (id: number): number => {
  return bblPerFt(id, 0);
};

export const bblPerFtAnnular = (outerDiameter: number, innerDiameter: number): number => {
  return bblPerFt(outerDiameter, innerDiameter);
};

export const hydrostaticPsi = (ppg: number, feet: number): number => {
  return ppg * PSI_PER_FT_FACTOR * feet;
};

export const linerAreaSqIn = (linerOd: number): number => {
  return (Math.PI / 4) * Math.pow(linerOd, 2);
};

export const psiToForce = (psi: number, areaInSqIn: number): number => {
  return psi * areaInSqIn;
};

export const buoyancyFactor = (mudPpg: number): number => {
  return (65.5 - mudPpg) / 65.5;
};

export const pipeSteelAreaIn2 = (od: number, id: number): number => {
  return (Math.PI / 4) * (Math.pow(od, 2) - Math.pow(id, 2));
};

export const stretchInInches = (loadLbs: number, lengthFt: number, areaIn2: number): number => {
  return (loadLbs * lengthFt) / (areaIn2 * STEEL_YOUNGS_MODULUS) * 12;
};

// ============================================================================
// INPUT TYPES & INTERFACES (Per PRD Section 2)
// ============================================================================

export interface PRDInputs {
  casing: { id: number; od: number; md: number; tvd: number };
  liner: { id: number; od: number; md: number; tvd: number; length: number };
  dp1: { id: number; od: number; length: number };
  dp2: { id: number; od: number; length: number };
  dpConfig: 'single' | 'dual';
  mud: { ppg: number };
  spacers: Array<{ label: string; volumeBbl: number; ppg: number }>;
  cements: Array<{ label: string; volumeBbl: number; ppg: number }>;
  displacements: Array<{ label: string; volumeBbl: number; ppg: number }>;
  dartLaunchVolumeBbl: number; // Volume pumped before dart release (bbl)
  holeOverlap: {
    openHoleId: number;
    linerOverlapFt: number;
    shoeTrackLengthFt: number;
    cementThickeningTimeMin: number;
    rigCapacityLbs: number;
    stingerId?: number;
    stingerLengthFt?: number;
    shearStrengthPsi?: number;  // Make shear strength configurable
    pumpStrokeToleranceBbl?: number;  // Add pump stroke tolerance
  };
  landingCollarMd: number;
  totalDepthMd: number;
  setdownForceLbs: number;
  hookloadSF: number;
  forceSF: number;
  findTvdFromMd: (md: number) => number;
}

export interface CementSegment {
  label: string;
  topMd: number;
  bottomMd: number;
  topTvd: number;
  bottomTvd: number;
  ppg: number;
  volumeBbl: number;
}

export interface AnnularColumn {
  label: string;
  ppg: number;
  topMd: number;
  bottomMd: number;
  topTvd: number;
  bottomTvd: number;
}

export interface InsideColumn {
  label: string;
  ppg: number;
  topTvd: number;
  bottomTvd: number;
}

export interface PRDResults {
  // Cement distribution results
  cementCapacityBelowLandingCollar: number;
  cementVolumePumped: number;
  excessCementBbl: number;
  shortageBbl: number;
  topOfCementMd: number;
  topOfCementTvd: number;
  reachedLandingCollar: boolean;

  // Plug logic results
  stringInternalVolBbl: number;
  canShear: boolean;
  canPushToLC: boolean;

  // Fluid columns for visualization
  annularColumns: AnnularColumn[];
  insideColumns: InsideColumn[];

  // Force calculations
  cementForceCalcs: {
    table: Array<{
      fluid: string;
      annulusPpg: number;
      insidePpg: number;
      deltaTvd: number;
      force: number;
      direction: 'Up' | 'Down';
    }>;
    totalForceChange: number;
    totalUTubePsi: number;
  };

  // Hookload and mechanical
  initialHookload: number;
  netForceOnHanger: number;
  netForceWithSF: number;
  stretchInInches: number;
  stretchInFeet: number;

  // Warnings and status
  warnings: string[];
}

// ============================================================================
// STEP 1: INPUT NORMALIZATION (Per PRD Section 4.1)
// ============================================================================

export interface NormalizationParams {
  casing: PipeConfig;
  liner: PipeConfig;
  dp1: PipeConfig;
  dp2: PipeConfig;
  dpConfig: 'single' | 'dual';
  mud: MudConfig;
  spacers: Fluid[];
  cements: Fluid[];
  displacements: Fluid[];
  dartLaunchVolumeBbl: number; // New parameter
  holeOverlap: HoleOverlapConfig;
  landingCollarMd: number;
  totalDepthMd: number;
  setdownForceLbs: number;
  hookloadSF: number;
  forceSF: number;
  findTvdFromMd: (md: number) => number;
}

export function normalizeInputs(params: NormalizationParams): PRDInputs {
  const {
    casing, liner, dp1, dp2, dpConfig, mud, spacers, cements, displacements,
  dartLaunchVolumeBbl, holeOverlap, landingCollarMd, totalDepthMd, setdownForceLbs, hookloadSF, forceSF, findTvdFromMd
  } = params;

  // Parse and validate inputs
  const pCasing = {
    id: parseFloat(casing.id || '0'),
    od: parseFloat(casing.od || '0'),
    md: parseFloat(casing.md || '0'),
    tvd: parseFloat(casing.tvd || '0'),
  };

  const pLiner = {
    id: parseFloat(liner.id || '0'),
    od: parseFloat(liner.od || '0'),
    md: parseFloat(liner.md || '0'),
    tvd: parseFloat(liner.tvd || '0'),
    length: parseFloat(liner.md || '0') - (pCasing.md - parseFloat(holeOverlap.linerOverlap || '0')),
  };

  const pDp1 = {
    id: parseFloat(dp1.id || '0'),
    od: parseFloat(dp1.od || '0'),
    length: parseFloat(dp1.length || '0'),
  };

  const pDp2 = {
    id: parseFloat(dp2.id || '0'),
    od: parseFloat(dp2.od || '0'),
    length: dpConfig === 'single' ? 0 : parseFloat(dp2.length || '0'),
  };

  // Validate critical inputs
  if (landingCollarMd >= pLiner.md) {
    throw new Error('Landing Collar MD must be shallower than liner shoe MD');
  }

  return {
    casing: pCasing,
    liner: pLiner,
    dp1: pDp1,
    dp2: pDp2,
    dpConfig,
    mud: { ppg: parseFloat(mud.ppg || '0') },
    spacers: spacers.map(s => ({
      label: s.label,
      volumeBbl: parseFloat(s.volume || '0'),
      ppg: parseFloat(s.ppg || '0'),
    })),
    cements: cements.map(c => ({
      label: c.label,
      volumeBbl: parseFloat(c.volume || '0'),
      ppg: parseFloat(c.ppg || '0'),
    })),
    displacements: displacements.map(d => ({
      label: d.label,
      volumeBbl: parseFloat(d.volume || '0'),
      ppg: parseFloat(d.ppg || '0'),
    })),
    dartLaunchVolumeBbl: parseFloat(String(dartLaunchVolumeBbl || 0)),
    holeOverlap: (() => {
      const base = {
        openHoleId: parseFloat(holeOverlap.openHoleId || '0'),
        linerOverlapFt: parseFloat(holeOverlap.linerOverlap || '0'),
        shoeTrackLengthFt: parseFloat(holeOverlap.shoeTrackLength || '0'),
        cementThickeningTimeMin: parseFloat(holeOverlap.cementThickeningTime || '0'),
        rigCapacityLbs: parseFloat(holeOverlap.rigCapacity || '0'),
      } as {
        openHoleId: number; linerOverlapFt: number; shoeTrackLengthFt: number; cementThickeningTimeMin: number; rigCapacityLbs: number;
        stingerId?: number; stingerLengthFt?: number; shearStrengthPsi?: number; pumpStrokeToleranceBbl?: number;
      };
      if (holeOverlap.shearStrengthPsi) {
        base.shearStrengthPsi = parseFloat(holeOverlap.shearStrengthPsi);
      }
      if (holeOverlap.pumpStrokeToleranceBbl) {
        base.pumpStrokeToleranceBbl = parseFloat(holeOverlap.pumpStrokeToleranceBbl);
      }
      return base;
    })(),
    landingCollarMd,
    totalDepthMd,
    setdownForceLbs,
    hookloadSF,
    forceSF,
    findTvdFromMd,
  };
}

// ============================================================================
// NEW: PLUG TRAVEL SIMULATION (Dart launch, latch, bump)
// ============================================================================

export function simulatePlugTravel(
  inputs: PRDInputs,
  capacities: Capacities,
  geometry: GeometricLengths,
  plugForces: PlugForceResults
): PlugTravelResults {
  const { dartLaunchVolumeBbl, holeOverlap, landingCollarMd } = inputs;

  // 1. Internal volume in DP1 + DP2 before plug latch
  const stringInternalVolBbl =
    (inputs.dp1.length * capacities.dp1Internal) +
    (inputs.dp2.length * capacities.dp2Internal);

  // 2. When does dart latch to plug? (account for pump stroke tolerance)
  const latchWhenBbl = stringInternalVolBbl - (holeOverlap.pumpStrokeToleranceBbl ?? 0.5);
  const latchMd = geometry.topOfLinerMd; // assuming latch at top of liner

  // 3. Check shear
  const shearSuccess = dartLaunchVolumeBbl >= latchWhenBbl;

  // 4. Volume to push plug from latch to landing collar
  const linerVolAboveLatch = (landingCollarMd - geometry.topOfLinerMd) * capacities.linerInternal;
  const volumeNeededForBump = linerVolAboveLatch - (holeOverlap.pumpStrokeToleranceBbl ?? 0.5);

  // 5. How much displacement pumped after latch
  const pumpedAfterLatch = inputs.displacements.reduce((sum, d) => sum + d.volumeBbl, 0);
  const bumpReached = pumpedAfterLatch >= volumeNeededForBump;

  // 6. Bump force & safety factor
  const bumpForceLbs = plugForces.bumpForceLbs;
  const bumpSafetyFactor = plugForces.safetyFactor;

  return {
    dartLaunchVolumeBbl,
    latchMd,
    shearSuccess,
    bumpVolumeBbl: pumpedAfterLatch,
    bumpReached,
    bumpForceLbs,
    bumpSafetyFactor
  };
}

// ============================================================================
// STEP 2: CAPACITY CALCULATIONS (Per PRD Section 4.2)
// ============================================================================

export interface Capacities {
  dp1Internal: number;
  dp2Internal: number;
  linerInternal: number;
  openHoleAnnulus: number;
  linerOverlapAnnulus: number;
  dpAnnulus: number;
}

export function computeCapacities(inputs: PRDInputs): Capacities {
  return {
    dp1Internal: bblPerFtInternal(inputs.dp1.id),
    dp2Internal: bblPerFtInternal(inputs.dp2.id),
    linerInternal: bblPerFtInternal(inputs.liner.id),
    openHoleAnnulus: bblPerFtAnnular(inputs.holeOverlap.openHoleId, inputs.liner.od),
    linerOverlapAnnulus: bblPerFtAnnular(inputs.casing.id, inputs.liner.od),
    dpAnnulus: bblPerFtAnnular(inputs.casing.id, Math.max(inputs.dp1.od, inputs.dp2.od)),
  };
}

// ============================================================================
// STEP 3: GEOMETRIC LENGTH DEFINITIONS (Per PRD Section 4.3)
// ============================================================================

export interface GeometricLengths {
  ratHoleFt: number;
  shoeTrackFt: number;
  annulusToLcFt: number;
  linerLengthFt: number;
  topOfLinerMd: number;
}

export function defineGeometricLengths(inputs: PRDInputs): GeometricLengths {
  const topOfLinerMd = inputs.casing.md - inputs.holeOverlap.linerOverlapFt;
  
  return {
    ratHoleFt: Math.max(inputs.totalDepthMd - inputs.liner.md, 0),
    shoeTrackFt: inputs.holeOverlap.shoeTrackLengthFt,
    annulusToLcFt: Math.max(inputs.liner.md - inputs.holeOverlap.shoeTrackLengthFt - inputs.landingCollarMd, 0),
    linerLengthFt: inputs.liner.md - topOfLinerMd,
    topOfLinerMd,
  };
}

// ============================================================================
// STEP 4: CEMENT CAPACITY BELOW LANDING COLLAR (Per PRD Section 4.4)
// ============================================================================

export function computeCementCapacityBelowLC(
  inputs: PRDInputs,
  capacities: Capacities,
  geometry: GeometricLengths
): number {
  // V_rat = ratHoleFt * bblPerFt(liner.od, openHoleId)
  const V_rat = geometry.ratHoleFt * capacities.openHoleAnnulus;
  
  // V_shoe = shoeTrackFt * bblPerFt(liner.id) (liner internal)
  const V_shoe = geometry.shoeTrackFt * capacities.linerInternal;
  
  // V_annulusToLC = annulusToLcFt * bblPerFt(liner.od, annulusInner)
  // Choose open-hole or overlap capacity based on geometry
  const annulusInner = inputs.landingCollarMd > inputs.casing.md ? 
    capacities.openHoleAnnulus : capacities.linerOverlapAnnulus;
  const V_annulusToLC = geometry.annulusToLcFt * annulusInner;
  
  const cementCapacityBelowLC = V_rat + V_shoe + V_annulusToLC;
  
  if (cementCapacityBelowLC <= 0) {
    throw new Error('Cement capacity below Landing Collar is zero or negative');
  }
  
  return cementCapacityBelowLC;
}

// ============================================================================
// STEP 5: BOTTOM-UP CEMENT DISTRIBUTION (Per PRD Section 4.5)
// ============================================================================

interface CementPlacementState {
  segments: CementSegment[];
  remainingCement: number;
  currentMd: number;
}

function fillRatHole(
  inputs: PRDInputs,
  capacities: Capacities,
  geometry: GeometricLengths,
  state: CementPlacementState
): void {
  if (geometry.ratHoleFt <= 0 || state.remainingCement <= 0) return;

  const ratHoleCapacity = geometry.ratHoleFt * capacities.openHoleAnnulus;
  const volumeToPlace = Math.min(state.remainingCement, ratHoleCapacity);
  const heightFilled = volumeToPlace / capacities.openHoleAnnulus;
  
  const topMd = state.currentMd - heightFilled;
  const bottomMd = state.currentMd;
  
  state.segments.push({
    label: 'Cement (Rat Hole)',
    topMd,
    bottomMd,
    topTvd: inputs.findTvdFromMd(topMd),
    bottomTvd: inputs.findTvdFromMd(bottomMd),
    ppg: inputs.cements[0]?.ppg || 0,
    volumeBbl: volumeToPlace,
  });
  
  state.remainingCement -= volumeToPlace;
  state.currentMd = topMd;
}

function fillShoeTrack(
  inputs: PRDInputs,
  capacities: Capacities,
  geometry: GeometricLengths,
  state: CementPlacementState
): void {
  if (geometry.shoeTrackFt <= 0 || state.remainingCement <= 0) return;

  const shoeTrackCapacity = geometry.shoeTrackFt * capacities.linerInternal;
  const volumeToPlace = Math.min(state.remainingCement, shoeTrackCapacity);
  const heightFilled = volumeToPlace / capacities.linerInternal;
  
  // Shoe track is inside the liner, starts from bottom of liner
  const topMd = inputs.liner.md - heightFilled;
  const bottomMd = inputs.liner.md;
  
  state.segments.push({
    label: 'Cement (Shoe Track)',
    topMd,
    bottomMd,
    topTvd: inputs.findTvdFromMd(topMd),
    bottomTvd: inputs.findTvdFromMd(bottomMd),
    ppg: inputs.cements[0]?.ppg || 0,
    volumeBbl: volumeToPlace,
  });
  
  state.remainingCement -= volumeToPlace;
  state.currentMd = topMd;
}

function getAnnulusSegmentConfig(
  inputs: PRDInputs,
  capacities: Capacities,
  workingMd: number
): { capacity: number; label: string; top: number } {
  if (workingMd > inputs.casing.md) {
    // Open hole section (above casing shoe)
    return {
      capacity: capacities.openHoleAnnulus,
      label: 'Cement (Open Hole Annulus)',
      top: Math.max(inputs.casing.md, inputs.landingCollarMd),
    };
  } else {
    // Overlap section (inside casing)
    return {
      capacity: capacities.linerOverlapAnnulus,
      label: 'Cement (Liner/Casing Overlap)',
      top: inputs.landingCollarMd,
    };
  }
}

function fillAnnulusToLandingCollar(
  inputs: PRDInputs,
  capacities: Capacities,
  geometry: GeometricLengths,
  state: CementPlacementState
): void {
  if (geometry.annulusToLcFt <= 0 || state.remainingCement <= 0) return;

  const currentDepth = Math.max(state.currentMd, inputs.liner.md); // Start from liner shoe
  let workingMd = currentDepth;
  
  while (state.remainingCement > 0 && workingMd > inputs.landingCollarMd) {
    const segmentConfig = getAnnulusSegmentConfig(inputs, capacities, workingMd);
    
    const segmentLength = workingMd - segmentConfig.top;
    const segmentCapacityBbl = segmentLength * segmentConfig.capacity;
    const volumeToPlace = Math.min(state.remainingCement, segmentCapacityBbl);
    const heightFilled = volumeToPlace / segmentConfig.capacity;
    
    const topMd = workingMd - heightFilled;
    const bottomMd = workingMd;
    
    if (volumeToPlace > 0) {
      state.segments.push({
        label: segmentConfig.label,
        topMd,
        bottomMd,
        topTvd: inputs.findTvdFromMd(topMd),
        bottomTvd: inputs.findTvdFromMd(bottomMd),
        ppg: inputs.cements[0]?.ppg || 0,
        volumeBbl: volumeToPlace,
      });
      
      state.remainingCement -= volumeToPlace;
      workingMd = topMd;
    } else {
      break;
    }
  }
  
  state.currentMd = workingMd;
}

export function distributeCementBottomUp(
  inputs: PRDInputs,
  capacities: Capacities,
  geometry: GeometricLengths
): {
  cementSegments: CementSegment[];
  excessCement: number;
  topOfCementMd: number;
  reachedLandingCollar: boolean;
} {
  const state: CementPlacementState = {
    segments: [],
    remainingCement: inputs.cements.reduce((sum, c) => sum + c.volumeBbl, 0),
    currentMd: inputs.totalDepthMd,
  };

  // Fill sections in order: rat hole, shoe track, annulus to landing collar
  fillRatHole(inputs, capacities, geometry, state);
  fillShoeTrack(inputs, capacities, geometry, state);
  fillAnnulusToLandingCollar(inputs, capacities, geometry, state);

  // Calculate final results
  const topOfCementMd = state.currentMd;
  const reachedLandingCollar = topOfCementMd <= inputs.landingCollarMd + FLOATING_POINT_TOLERANCE;
  const excessCement = Math.max(0, state.remainingCement);

  return {
    cementSegments: state.segments,
    excessCement,
    topOfCementMd,
    reachedLandingCollar,
  };
}

// ============================================================================
// STEP 6: INSIDE PATH FLUID PLACEMENT (Per PRD Section 4.6)
// ============================================================================

// ============================================================================
// STEP 6: INSIDE PATH FLUID PLACEMENT (Per PRD Section 4.6)
// ============================================================================

interface PathSegmentWithDepth {
  name: string;
  length: number;
  capacity: number;
  startDepth: number;
}

interface FluidPlacementState {
  columns: InsideColumn[];
  currentSegmentIndex: number;
  segmentVolumeUsed: number;
  currentVolume: number;
}

function createPathSegments(inputs: PRDInputs, capacities: Capacities, geometry: GeometricLengths): PathSegmentWithDepth[] {
  return [
    { name: 'DP1', length: inputs.dp1.length, capacity: capacities.dp1Internal, startDepth: 0 },
    { name: 'DP2', length: inputs.dp2.length, capacity: capacities.dp2Internal, startDepth: inputs.dp1.length },
    { 
      name: 'Liner Above Shoe', 
      length: Math.max(inputs.landingCollarMd - geometry.topOfLinerMd, 0), 
      capacity: capacities.linerInternal,
      startDepth: inputs.dp1.length + inputs.dp2.length
    },
    { 
      name: 'Shoe Track', 
      length: geometry.shoeTrackFt, 
      capacity: capacities.linerInternal,
      startDepth: inputs.dp1.length + inputs.dp2.length + Math.max(inputs.landingCollarMd - geometry.topOfLinerMd, 0)
    },
  ];
}

function moveToNextSegmentIfFull(pathSegments: PathSegmentWithDepth[], state: FluidPlacementState): void {
  const currentSegment = pathSegments[state.currentSegmentIndex];
  if (currentSegment && state.segmentVolumeUsed >= currentSegment.length * currentSegment.capacity) {
    state.currentSegmentIndex++;
    state.segmentVolumeUsed = 0;
  }
}

function placeFluidInSegment(
  fluid: { label: string; volumeBbl: number; ppg: number },
  pathSegments: PathSegmentWithDepth[],
  state: FluidPlacementState,
  volumeToPlace: number
): void {
  const currentSegment = pathSegments[state.currentSegmentIndex];
  if (!currentSegment) return;

  const fluidHeightInSegment = volumeToPlace / currentSegment.capacity;
  const topTvd = currentSegment.startDepth + (state.segmentVolumeUsed / currentSegment.capacity);
  const bottomTvd = topTvd + fluidHeightInSegment;
  
  state.columns.push({
    label: `${fluid.label} (${currentSegment.name})`,
    ppg: fluid.ppg,
    topTvd,
    bottomTvd,
  });
  
  state.segmentVolumeUsed += volumeToPlace;
  state.currentVolume += volumeToPlace;
}

function placeFluidVolume(
  fluid: { label: string; volumeBbl: number; ppg: number },
  pathSegments: PathSegmentWithDepth[],
  state: FluidPlacementState
): number {
  let remainingFluidVolume = fluid.volumeBbl;
  
  while (remainingFluidVolume > 0 && state.currentSegmentIndex < pathSegments.length) {
    const currentSegment = pathSegments[state.currentSegmentIndex];
    if (!currentSegment) break;
    
    const segmentRemainingCapacity = (currentSegment.length * currentSegment.capacity) - state.segmentVolumeUsed;
    
    if (segmentRemainingCapacity <= 0) {
      state.currentSegmentIndex++;
      state.segmentVolumeUsed = 0;
      continue;
    }
    
    const volumeToPlace = Math.min(remainingFluidVolume, segmentRemainingCapacity);
    placeFluidInSegment(fluid, pathSegments, state, volumeToPlace);
    
    remainingFluidVolume -= volumeToPlace;
    moveToNextSegmentIfFull(pathSegments, state);
  }
  
  return remainingFluidVolume;
}

function fillRemainingSegmentsWithMud(
  inputs: PRDInputs,
  pathSegments: PathSegmentWithDepth[],
  state: FluidPlacementState
): void {
  while (state.currentSegmentIndex < pathSegments.length) {
    const currentSegment = pathSegments[state.currentSegmentIndex];
    if (!currentSegment) break;
    
    const segmentRemainingCapacity = (currentSegment.length * currentSegment.capacity) - state.segmentVolumeUsed;
    
    if (segmentRemainingCapacity > 0) {
      const topTvd = currentSegment.startDepth + (state.segmentVolumeUsed / currentSegment.capacity);
      const bottomTvd = currentSegment.startDepth + currentSegment.length;
      
      state.columns.push({
        label: `Mud (${currentSegment.name})`,
        ppg: inputs.mud.ppg,
        topTvd,
        bottomTvd,
      });
    }
    
    state.currentSegmentIndex++;
    state.segmentVolumeUsed = 0;
  }
}

export function buildInsideFluidColumns(
  inputs: PRDInputs, 
  capacities: Capacities, 
  geometry: GeometricLengths
): InsideColumn[] {
  const pathSegments = createPathSegments(inputs, capacities, geometry);
  const orderedFluids = [...inputs.spacers, ...inputs.displacements];
  
  const state: FluidPlacementState = {
    columns: [],
    currentSegmentIndex: 0,
    segmentVolumeUsed: 0,
    currentVolume: 0,
  };
  
  // Place each fluid sequentially
  for (const fluid of orderedFluids) {
    if (fluid.volumeBbl <= 0) continue;
    
    const remainingFluidVolume = placeFluidVolume(fluid, pathSegments, state);
    
    if (remainingFluidVolume > 0) {
      console.warn(`Could not place ${remainingFluidVolume} bbl of ${fluid.label} - insufficient string capacity`);
      break;
    }
  }
  
  // Fill remaining space with mud
  fillRemainingSegmentsWithMud(inputs, pathSegments, state);
  
  return state.columns;
}

// ============================================================================
// STEP 7: PLUG SHEAR & BUMP LOGIC (Per PRD Section 4.7)
// ============================================================================

export function computePlugLogic(inputs: PRDInputs, capacities: Capacities, geometry: GeometricLengths): {
  stringInternalVolBbl: number;
  canShear: boolean;
  canPushToLC: boolean;
} {
  // String internal volume calculation
  const stingerLength = inputs.holeOverlap.stingerLengthFt || 0;
  const stingerCapacity = inputs.holeOverlap.stingerId ? bblPerFtInternal(inputs.holeOverlap.stingerId) : 0;
  
  const stringInternalVolBbl = 
    (inputs.dp1.length * capacities.dp1Internal) +
    (inputs.dp2.length * capacities.dp2Internal) +
    (stingerLength * stingerCapacity);
  
  // Volume pumped before dart (spacers + cement)
  const volumePumpedBeforeDart = 
    inputs.spacers.reduce((sum, s) => sum + s.volumeBbl, 0) +
    inputs.cements.reduce((sum, c) => sum + c.volumeBbl, 0);
  
  // Add pump stroke tolerance (default ±0.5 bbl if not specified)
  const pumpTolerance = inputs.holeOverlap.pumpStrokeToleranceBbl || 0.5;
  const canShear = volumePumpedBeforeDart >= (stringInternalVolBbl - pumpTolerance);
  
  // Volume to push plug to LC
  const linerInternalExcludingShoeBbl = 
    Math.max(inputs.landingCollarMd - geometry.topOfLinerMd, 0) * capacities.linerInternal;
  
  const volumeToPushPlugToLC = linerInternalExcludingShoeBbl;
  const pumpedAfterShear = inputs.displacements.reduce((sum, d) => sum + d.volumeBbl, 0);
  
  const canPushToLC = pumpedAfterShear >= (volumeToPushPlugToLC - pumpTolerance);
  
  return {
    stringInternalVolBbl,
    canShear,
    canPushToLC,
  };
}

// ============================================================================
// STEP 6: PLUG LOGIC FORCE CALCULATIONS (Per PRD Section 4.6)
// ============================================================================

export function calculatePlugForces(
  inputs: PRDInputs,
  distribution: {
    cementSegments: CementSegment[];
    topOfCementMd: number;
    reachedLandingCollar: boolean;
  }
): PlugForceResults {
  const { holeOverlap, setdownForceLbs } = inputs;

  // Use liner ID (seat) if present, else fall back to open hole ID.
  const seatDiameter = inputs.liner.id || holeOverlap.openHoleId;
  const plugAreaSqIn = linerAreaSqIn(seatDiameter); // π/4 d^2

  // Hydrostatic pressure: sum of each segment's TVD contribution.
  let hydrostaticPsiTotal = 0;
  for (const segment of distribution.cementSegments) {
    const topTvd = Number(inputs.findTvdFromMd(segment.topMd));
    const bottomTvd = Number(inputs.findTvdFromMd(segment.bottomMd));
    const dTvd = Math.abs(bottomTvd - topTvd);
    if (dTvd > 0) hydrostaticPsiTotal += segment.ppg * PSI_PER_FT_FACTOR * dTvd;
  }

  const plugForceLbs = psiToForce(hydrostaticPsiTotal, plugAreaSqIn);

  // Simplified shear capacity: circumference * assumed 1 ft contact * shear strength.
  const shearStrengthPsi = holeOverlap.shearStrengthPsi || 500;
  const assumedContactFt = 1;
  const shearAreaSqIn = Math.PI * seatDiameter * (assumedContactFt * 12);
  const shearCapacityLbs = shearStrengthPsi * shearAreaSqIn;

  const bumpForceLbs = plugForceLbs + setdownForceLbs;
  const bumpMarginLbs = shearCapacityLbs - bumpForceLbs;

  return {
    plugAreaSqIn,
    hydrostaticPsi: hydrostaticPsiTotal,
    plugForceLbs,
    shearCapacityLbs,
    bumpForceLbs,
    bumpMarginLbs,
    safetyFactor: bumpForceLbs > 0 ? shearCapacityLbs / bumpForceLbs : 0,
  };
}

// ============================================================================
// STEP 7: DISPLACEMENT AND HOOKLOAD CALCULATIONS (Per PRD Section 4.7)
// ============================================================================

export function calculateDisplacementAndHookload(
  inputs: PRDInputs,
  capacities: Capacities
): DisplacementResults {
  const { displacements, spacers } = inputs;

  const spacerVolumeBbl = spacers.reduce((sum, s) => sum + s.volumeBbl, 0);
  const displacementVolumeBbl = displacements.reduce((sum, d) => sum + d.volumeBbl, 0);
  const totalDisplacementBbl = spacerVolumeBbl + displacementVolumeBbl;

  const pipeStringVolumeBbl = (
    inputs.dp1.length * capacities.dp1Internal +
    inputs.dp2.length * capacities.dp2Internal
  );

  // Steel weight from geometry: area * length * density.
  const steelDensity = 0.283; // lb/in^3
  const dp1Area = pipeSteelAreaIn2(inputs.dp1.od, inputs.dp1.id);
  const dp2Area = pipeSteelAreaIn2(inputs.dp2.od, inputs.dp2.id);
  const dp1Steel = dp1Area * 12 * steelDensity * inputs.dp1.length;
  const dp2Steel = dp2Area * 12 * steelDensity * inputs.dp2.length;
  const pipeWeightLbs = dp1Steel + dp2Steel;

  // Internal fluids (account for pumped fluids + remaining mud)
  const inside: { volumeBbl: number; ppg: number }[] = [];
  spacers.forEach(s => inside.push({ volumeBbl: s.volumeBbl, ppg: s.ppg }));
  displacements.forEach(d => inside.push({ volumeBbl: d.volumeBbl, ppg: d.ppg }));
  const accounted = inside.reduce((a, f) => a + f.volumeBbl, 0);
  const remainingMud = Math.max(pipeStringVolumeBbl - accounted, 0);
  if (remainingMud > 0) inside.push({ volumeBbl: remainingMud, ppg: inputs.mud.ppg });
  const fluidWeightLbs = inside.reduce((sum, f) => sum + f.volumeBbl * 42 * f.ppg, 0);

  // Buoyancy: external displacement volume * external fluid density (assume mud ppg)
  const dp1Ext = inputs.dp1.length * bblPerFtInternal(inputs.dp1.od);
  const dp2Ext = inputs.dp2.length * bblPerFtInternal(inputs.dp2.od);
  const buoyancyLbs = (dp1Ext + dp2Ext) * 42 * inputs.mud.ppg;

  const hookloadLbs = pipeWeightLbs + fluidWeightLbs - buoyancyLbs; // raw hookload

  return {
    spacerVolumeBbl,
    displacementVolumeBbl,
    totalDisplacementBbl,
    pipeStringVolumeBbl,
    hookloadLbs,
    pipeWeightLbs,
    fluidWeightLbs,
    buoyancyLbs
  };
}

// ============================================================================
// STEP 8: FINAL RESULT ASSEMBLY (Per PRD Section 4.8)
// ============================================================================

export function assembleCalculationResults(
  inputs: PRDInputs,
  capacities: Capacities,
  geometry: GeometricLengths,
  distribution: {
    cementSegments: CementSegment[];
    excessCement: number;
    topOfCementMd: number;
    reachedLandingCollar: boolean;
  },
  plugForces: PlugForceResults,
  displacement: DisplacementResults,
  plugTravel: PlugTravelResults
): EnhancedCalculationResults {
  // Calculate TOC (Top of Cement) in various units
  const tocMd = distribution.topOfCementMd;
  const tocTvd = Number(inputs.findTvdFromMd(tocMd));
  const tocAboveLinerShoeFt = inputs.liner.md - tocMd;
  
  // Calculate total cement volume and check excess
  const totalCementVolumeBbl = inputs.cements.reduce((sum, c) => sum + c.volumeBbl, 0);
  const placedCementVolumeBbl = totalCementVolumeBbl - distribution.excessCement;
  const cementUtilization = (placedCementVolumeBbl / totalCementVolumeBbl) * 100;
  
  // Check critical safety margins
  // Apply hookload safety factor externally so raw hookload physics remain transparent.
  const factoredHookload = displacement.hookloadLbs * inputs.hookloadSF;
  const rigCapacityMarginLbs = inputs.holeOverlap.rigCapacityLbs - factoredHookload;
  const forceMarginPct = (plugForces.bumpMarginLbs / plugForces.shearCapacityLbs) * 100;
  
  // Dynamic surge check - bump force vs rig capacity
  const dynamicSurgeMarginLbs = inputs.holeOverlap.rigCapacityLbs - plugForces.bumpForceLbs;
  
  // Determine job status
  let jobStatus: 'success' | 'warning' | 'failure' = 'success';
  const warnings: string[] = [];
  
  // Critical failures
  if (rigCapacityMarginLbs < 0) {
    jobStatus = 'failure';
    warnings.push(`Rig capacity exceeded by ${Math.abs(rigCapacityMarginLbs).toFixed(0)} lbs`);
  }
  
  if (dynamicSurgeMarginLbs < 0) {
    jobStatus = 'failure';
    warnings.push(`Dynamic bump force exceeds rig capacity by ${Math.abs(dynamicSurgeMarginLbs).toFixed(0)} lbs`);
  }
  
  if (!distribution.reachedLandingCollar) {
    jobStatus = 'failure';
    warnings.push('Cement did not reach landing collar');
  }
  
  // TOC above LC check - unexpected cement overflow
  if (tocMd < inputs.landingCollarMd && distribution.excessCement > 0) {
    jobStatus = 'warning';
    warnings.push(`TOC unexpectedly above Landing Collar due to excess cement (${distribution.excessCement.toFixed(1)} bbl excess)`);
  }
  
  // Safety margin warnings
  if (forceMarginPct < 20 && jobStatus !== 'failure') {
    jobStatus = 'warning';
    warnings.push(`Low safety margin on plug forces (${forceMarginPct.toFixed(1)}%)`);
  }
  
  if (distribution.excessCement > totalCementVolumeBbl * 0.1 && jobStatus !== 'failure') {
    jobStatus = 'warning';
    warnings.push(`Significant cement excess (${((distribution.excessCement / totalCementVolumeBbl) * 100).toFixed(1)}%)`);
  }
  
  // Low rig capacity margin warning
  if (rigCapacityMarginLbs < inputs.holeOverlap.rigCapacityLbs * 0.1 && rigCapacityMarginLbs >= 0 && jobStatus !== 'failure') {
    jobStatus = 'warning';
    warnings.push(`Low rig capacity margin (${rigCapacityMarginLbs.toFixed(0)} lbs remaining)`);
  }
  
  return {
    // Executive Summary
    jobStatus,
    warnings,
    tocMd,
    tocTvd,
    tocAboveLinerShoeFt,
    
    // Cement Distribution
    cementSegments: distribution.cementSegments,
    totalCementVolumeBbl,
    placedCementVolumeBbl,
    excessCementBbl: distribution.excessCement,
    cementUtilization,
    
    // Forces and Safety
  plugForces,
  plugTravel,
    displacement,
  rigCapacityMarginLbs,
  factoredHookloadLbs: factoredHookload,
    forceMarginPct,
    
    // Geometric Calculations
    geometry,
    capacities,
    
    // Input Echo (for verification)
    inputs,
    
    // Calculation Metadata
    calculationTimestamp: new Date().toISOString(),
    prdVersion: '1.0',
    calculationMethod: 'bottom-up-cement-distribution',
  };
}

// ============================================================================
// MAIN CALCULATION ENGINE FUNCTION
// ============================================================================

export function calculateEnhancedCementingJob(
  params: {
    casing: any;
    liner: any;
    dp1: any;
    dp2: any;
    dpConfig: 'single' | 'dual';
    mud: any;
    spacers: any[];
    cements: any[];
    displacements: any[];
    holeOverlap: any;
    landingCollarMd: number;
    totalDepthMd: number;
    setdownForceLbs: number;
    hookloadSF: number;
    forceSF: number;
    findTvdFromMd: (md: number) => number;
  dartLaunchVolumeBbl: number;
  }
): EnhancedCalculationResults {
  try {
    // Destructure parameters
    const {
  casing, liner, dp1, dp2, dpConfig, mud, spacers, cements, displacements,
  holeOverlap, landingCollarMd, totalDepthMd, setdownForceLbs, hookloadSF, forceSF, findTvdFromMd, dartLaunchVolumeBbl
    } = params;
    
    // Step 1: Normalize and validate inputs
    const inputs = normalizeInputs({
      casing, liner, dp1, dp2, dpConfig, mud, spacers, cements, displacements,
      dartLaunchVolumeBbl,
      holeOverlap, landingCollarMd, totalDepthMd, setdownForceLbs, hookloadSF, forceSF, findTvdFromMd
    });
    
    // Step 2: Calculate pipe capacities
    const capacities = computeCapacities(inputs);
    
    // Step 3: Calculate geometric lengths
    const geometry = defineGeometricLengths(inputs);
    
    // Step 4: Calculate cement capacity below landing collar (for reference)
    // const cementCapacityBelowLC = computeCementCapacityBelowLC(inputs, capacities, geometry);
    
    // Step 5: Distribute cement bottom-up
    const distribution = distributeCementBottomUp(inputs, capacities, geometry);
    
    // Step 6: Calculate plug forces
    const plugForces = calculatePlugForces(inputs, distribution);
    
    // Step 7: Calculate displacement and hookload
    const displacement = calculateDisplacementAndHookload(inputs, capacities);

    // New Step: Simulate plug travel & bump sequence
    const plugTravel = simulatePlugTravel(inputs, capacities, geometry, plugForces);
    
    // Step 8: Assemble final results (now includes plugTravel)
    return assembleCalculationResults(
      inputs, capacities, geometry, distribution, plugForces, displacement, plugTravel
    );
    
  } catch (error) {
    throw new Error(`Enhanced calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
