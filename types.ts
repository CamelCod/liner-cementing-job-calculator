

export interface KeyVolumeEntry {
  length: number;
  bblFt: number;
  volume: number;
}

export interface PipeConfig {
  grade: string;
  od: string;
  id: string;
  wt: string;
  length?: string;
  md?: string;
  tvd?: string;
}

export interface ParsedPipeConfig {
  grade: string;
  od: number;
  id: number;
  wt: number;
  length: number;
  md: number;
  tvd: number;
}


export interface Depth {
  md: string;
  tvd: string;
}

export interface HoleOverlapConfig {
  openHoleId: string;
  linerOverlap: string;
  shoeTrackLength: string;
  ratHoleLength?: string;
  cementThickeningTime: string;
  rigCapacity: string;
  casingFrictionFactor: string;
  openHoleFrictionFactor: string;
}

export interface Fluid {
  label: string;
  volume: string;
  ppg: string;
}

export interface MudConfig {
  ppg: string;
}

export type SurveyRow = [string, string, string];


// --- Plotting Types ---
export interface PlotSeriesData {
  [key: string]: string | number | undefined;
}

export interface PlotLineConfig {
    key: string;
    name: string;
    color: string;
}

export interface PlotThresholdLine {
    label: string;
    value: number;
    color: string;
}

export interface PlotOptions {
    xlabel: string;
    ylabel: string;
    stacked?: boolean;
    invert_y?: boolean;
    threshold_lines?: PlotThresholdLine[];
    layout?: 'horizontal' | 'vertical';
}

export interface PlotConfig {
    id: string;
    type: 'bar' | 'line';
    title: string;
    x_field: string;
    y_fields: PlotLineConfig[];
    series: PlotSeriesData[];
    options: PlotOptions;
}

export interface TorqueDragPoint extends PlotSeriesData {
    depth: number;
    hookload_in: number;
    hookload_out: number;
    torque: number;
    drag: number;
}
export interface TorqueDragResult {
    plotData: TorqueDragPoint[];
    summary: string;
}

// --- Cement Force Types ---
export interface CementForceRow {
    fluid: string;
    annulusPpg: number;
    insidePpg: number;
    deltaTvd: number;
    force: number;
    direction: 'Up' | 'Down';
}

export interface CementForceCalcs {
    table: CementForceRow[];
    originalBuoyedWeight: number;
    finalBuoyedWeight: number;

    totalForceChange: number;
    totalUTubePsi: number;
    shoeDifferentialPsi: number;
}


export interface DeproReport {
    title: string;
    executiveSummary: string;
    introduction: string;
    jobDetails: string;
    volumetricAnalysis: string;
    mechanicalAnalysis: string;
    conclusion: string;
}


export type ActiveTab = 'well-config' | 'fluid-config' | 'fluids' | 'survey' | 'results' | 'advanced';


// --- NEW STRUCTURED CALCULATION TYPES ---

export interface JobSummary {
    wellName: string;
    date: string;
    linerTopDepth: number;
    linerShoeDepth: number;
    linerLength: number;
}

export interface KeyCalculationResults {
    initialHookload: number;
    hookloadWithSF: number;
    postCementHookload: number;
    drillStringStretch: number;
    netForceOnLinerHanger: number;
    netForceWithSF: number;
    requiredCementVolume: number;
    uTubePressureDifferential: number;
    criticalPumpRate: number;
}

export interface SafetyStatusIndicators {
    hookloadStatus: 'OK' | 'Exceeds Rig Capacity';
    netForceStatus: string; // For now just the value as string
    stretchStatus: string; // Just the value as string
}

export interface BuoyancyAndWeightCalcs {
    mudBuoyancyFactor: number;
    spacerBuoyancyFactor: number; // Assuming an average for simplicity
    cementBuoyancyFactor: number; // Assuming an average for simplicity
    linerAirWeight: number;
    linerBuoyedWeight: number;
    dpAirWeight: number;
    dpBuoyedWeight: number;
}

export interface VolumeCalcs {
    linerCapacity: number; // bbl/ft
    dpCapacity: number; // bbl/ft
    annulusVolume: number; // bbl
    totalCementRequired: number; // bbl
    stringDisplacement: number; // bbl
}

export interface HydrostaticPressureCalcs {
    mudPressureAtLinerTop: number;
    mudPressureAtLinerShoe: number;
    cementPressureAtLinerTop: number;
    cementPressureAtLinerShoe: number;
}

export interface HookloadCalcs {
    initialHookload: number;
    hookloadWithSF: number;
    postCementHookload: number;
}

export interface StretchCalcs {
    setdownForce: number;
    totalLoadOnDrillString: number;
    drillStringCrossSection: number;
    stretchDueToLoad: number; // Inches
    stretchInFeet: number;
}

export interface ForceAnalysisOnLinerHanger {
    downwardForceLinerWeight: number;
    downwardForceSetdown: number;
    upwardForceCementBuoyancy: number;
    netDownwardForce: number;
    netForceWithSF: number;
}

export interface UTubeEffectCalcs {
    pressureDiffAtSurface: number;
    criticalPumpRate: number;
}

export interface Calculations {
    jobSummary: JobSummary;
    keyResults: KeyCalculationResults;
    safetyStatus: SafetyStatusIndicators;
    buoyancyAndWeight: BuoyancyAndWeightCalcs;
    volumeCalcs: VolumeCalcs;
    hydrostaticPressure: HydrostaticPressureCalcs;
    hookloadCalcs: HookloadCalcs;
    stretchCalcs: StretchCalcs;
    forceAnalysis: ForceAnalysisOnLinerHanger;
    uTubeEffect: UTubeEffectCalcs;
    
    // Original detailed data for other components
    keyVolumes: KeyVolumeEntry[];
    cementForces: CementForceCalcs | null;
    plots: PlotConfig[];
    torqueDragResult: TorqueDragResult | null; // backward-compatible: typically the 'rotate' profile
    torqueDragRotate?: TorqueDragResult | null;
    torqueDragNoRotate?: TorqueDragResult | null;
}
