
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

export interface KeyVolumes {
  dp1: KeyVolumeEntry;
  dp2: KeyVolumeEntry;
  liner: KeyVolumeEntry;
  shoeTrack: KeyVolumeEntry;
  ratHole: KeyVolumeEntry;
  ohAnnulus: KeyVolumeEntry;
  linerOverlap: KeyVolumeEntry;
}

export interface DetailedVolumes {
  totalAnnulus: number;
  totalString: number;
  fullCycle: number;
  fullLiner: number;
  volumeToPumpPlug: number;
}

export interface StretchWeightCalcs {
  buoyancyFactor: number;
  linerAirWeight: number;
  linerBuoyedWeight: number;
  dpAirWeight: number;
  dpBuoyedWeight: number;
  hookLoad: number;
  stringWtAfterRelease: number;
  stretchDueToLiner: number;
}

export interface PressureForceCalcs {
  minPumpRate: number;
  balancedHolePressure: number;
}

export interface LengthsDepths {
    linerLength: number;
    topOfLiner: number;
    ratHole: number;
}


// --- Plotting Types ---
export interface PlotSeriesData {
  [key: string]: string | number;
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

export interface Calculations {
  keyVolumes: KeyVolumes;
  detailedVolumes: DetailedVolumes;
  stretchWeight: StretchWeightCalcs;
  pressureForce: PressureForceCalcs;
  lengthsDepths: LengthsDepths;
  plots: PlotConfig[];
  torqueDragResult: TorqueDragResult | null;
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

// --- Cement Force & Hydrostatic Analysis ---
export type CementForceDirection = 'D' | 'U';

export interface CementForceStep {
  fluid1: string;
  ppg1: number;
  fluid2: string;
  ppg2: number;
  length_ft: number;
  area_in2: number;
  direction: CementForceDirection;
}

export interface CementForceComputedStep extends CementForceStep {
  deltaPpg: number;
  psi: number; // signed based on density diff
  force_lbf: number; // absolute magnitude
  forceSigned_lbf: number; // sign based on direction (D=+, U=-)
}

export interface CementForceSummary {
  originalHookLoad_lbf: number;
  totalDown_lbf: number;
  totalUp_lbf: number;
  finalHookLoad_lbf: number;
  uTubePsiTotal: number;
  steps: CementForceComputedStep[];
  shoeDifferentialPsi?: number; // optional, if computed separately
}
