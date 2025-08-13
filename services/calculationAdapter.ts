/**
 * Adapter to convert enhanced calculation results to legacy Calculations interface
 * This maintains compatibility with existing UI components while using the new engine
 */

import type { Calculations, JobSummary, KeyCalculationResults, SafetyStatusIndicators, 
  BuoyancyAndWeightCalcs, VolumeCalcs, HydrostaticPressureCalcs, HookloadCalcs, 
  StretchCalcs, ForceAnalysisOnLinerHanger, UTubeEffectCalcs, VolumeOperations, 
  CementOperations, PlotConfig, TorqueDragResult } from '../types';
import type { EnhancedCalculationResults } from './enhancedCalculationEngine';

export function adaptEnhancedResultsToLegacy(
  enhancedResults: EnhancedCalculationResults,
  wellName: string,
  jobDate: string,
  previousPlots?: PlotConfig[],
  previousTorqueDrag?: TorqueDragResult | null
): Calculations {
  
  // Create detailed calculation steps for display
  const stepByStepCalculations = {
    step1: {
      title: "Input Normalization & Validation",
      details: {
        casingId: enhancedResults.inputs.casing.id,
        casingOd: enhancedResults.inputs.casing.od,
        linerLength: enhancedResults.inputs.liner.length,
        openHoleId: enhancedResults.inputs.holeOverlap.openHoleId,
        landingCollarMd: enhancedResults.inputs.landingCollarMd,
        totalDepthMd: enhancedResults.inputs.totalDepthMd
      }
    },
    step2: {
      title: "Pipe Capacity Calculations",
      details: {
        linerCapacity: enhancedResults.capacities.linerInternal,
        dp1Capacity: enhancedResults.capacities.dp1Internal,
        dp2Capacity: enhancedResults.capacities.dp2Internal,
        openHoleAnnulus: enhancedResults.capacities.openHoleAnnulus,
        linerOverlapAnnulus: enhancedResults.capacities.linerOverlapAnnulus
      }
    },
    step3: {
      title: "Geometric Length Definitions",
      details: {
        topOfLinerMd: enhancedResults.geometry.topOfLinerMd,
        ratHoleFt: enhancedResults.geometry.ratHoleFt,
        shoeTrackFt: enhancedResults.geometry.shoeTrackFt,
        annulusToLcFt: enhancedResults.geometry.annulusToLcFt,
        linerLengthFt: enhancedResults.geometry.linerLengthFt
      }
    },
    step4: {
      title: "Bottom-Up Cement Distribution",
      details: {
        cementSegments: enhancedResults.cementSegments.map(segment => ({
          label: segment.label,
          topMd: segment.topMd,
          bottomMd: segment.bottomMd,
          volumeBbl: segment.volumeBbl,
          ppg: segment.ppg
        })),
        topOfCementMd: enhancedResults.tocMd,
        topOfCementTvd: enhancedResults.tocTvd,
        cementUtilization: enhancedResults.cementUtilization,
        excessCement: enhancedResults.excessCementBbl
      }
    },
    step5: {
      title: "Plug Force & Shear Calculations",
      details: {
        plugAreaSqIn: enhancedResults.plugForces.plugAreaSqIn,
        hydrostaticPsi: enhancedResults.plugForces.hydrostaticPsi,
        plugForceLbs: enhancedResults.plugForces.plugForceLbs,
        shearCapacityLbs: enhancedResults.plugForces.shearCapacityLbs,
        bumpForceLbs: enhancedResults.plugForces.bumpForceLbs,
        bumpMarginLbs: enhancedResults.plugForces.bumpMarginLbs,
        safetyFactor: enhancedResults.plugForces.safetyFactor
      }
    },
    step5b: {
      title: "Plug Travel Sequence",
      details: {
        dartLaunchVolumeBbl: enhancedResults.plugTravel.dartLaunchVolumeBbl,
        latchMd: enhancedResults.plugTravel.latchMd,
        shearSuccess: enhancedResults.plugTravel.shearSuccess,
        bumpVolumeBbl: enhancedResults.plugTravel.bumpVolumeBbl,
        bumpReached: enhancedResults.plugTravel.bumpReached,
        bumpForceLbs: enhancedResults.plugTravel.bumpForceLbs,
        bumpSafetyFactor: enhancedResults.plugTravel.bumpSafetyFactor
      }
    },
    step6: {
      title: "Displacement & Hookload Calculations",
      details: {
        spacerVolumeBbl: enhancedResults.displacement.spacerVolumeBbl,
        displacementVolumeBbl: enhancedResults.displacement.displacementVolumeBbl,
        totalDisplacementBbl: enhancedResults.displacement.totalDisplacementBbl,
        pipeStringVolumeBbl: enhancedResults.displacement.pipeStringVolumeBbl,
        hookloadLbs: enhancedResults.displacement.hookloadLbs,
        pipeWeightLbs: enhancedResults.displacement.pipeWeightLbs,
        fluidWeightLbs: enhancedResults.displacement.fluidWeightLbs,
        buoyancyLbs: enhancedResults.displacement.buoyancyLbs
      }
    },
    step7: {
      title: "Safety & Margin Analysis",
      details: {
        jobStatus: enhancedResults.jobStatus,
        warnings: enhancedResults.warnings,
        rigCapacityMarginLbs: enhancedResults.rigCapacityMarginLbs,
        forceMarginPct: enhancedResults.forceMarginPct,
        tocAboveLinerShoeFt: enhancedResults.tocAboveLinerShoeFt
      }
    }
  };

  // Build JobSummary
  const jobSummary: JobSummary = {
    wellName,
    date: jobDate,
    linerTopDepth: enhancedResults.geometry.topOfLinerMd,
    linerShoeDepth: enhancedResults.inputs.liner.md,
    linerLength: enhancedResults.geometry.linerLengthFt
  };

  // Build KeyCalculationResults
  const keyResults: KeyCalculationResults = {
    initialHookload: enhancedResults.displacement.hookloadLbs,
    hookloadWithSF: enhancedResults.displacement.hookloadLbs * enhancedResults.inputs.hookloadSF,
    postCementHookload: enhancedResults.displacement.hookloadLbs + enhancedResults.plugForces.plugForceLbs,
    drillStringStretch: (enhancedResults.displacement.hookloadLbs / 1000) * 0.1, // Simplified estimate
    netForceOnLinerHanger: enhancedResults.plugForces.bumpForceLbs,
    netForceWithSF: enhancedResults.plugForces.bumpForceLbs * enhancedResults.inputs.forceSF,
    requiredCementVolume: enhancedResults.totalCementVolumeBbl,
    uTubePressureDifferential: enhancedResults.plugForces.hydrostaticPsi * 0.1, // Simplified
    criticalPumpRate: 5.0 // Default value
  };

  // Build SafetyStatusIndicators
  const safetyStatus: SafetyStatusIndicators = {
    hookloadStatus: enhancedResults.rigCapacityMarginLbs > 0 ? 'OK' : 'Exceeds Rig Capacity',
    netForceStatus: `${enhancedResults.forceMarginPct.toFixed(1)}% margin`,
    stretchStatus: `${keyResults.drillStringStretch.toFixed(2)} in`
  };

  // Build other required interfaces with derived values
  const buoyancyAndWeight: BuoyancyAndWeightCalcs = {
    mudBuoyancyFactor: 0.8, // Typical value
    spacerBuoyancyFactor: 0.75,
    cementBuoyancyFactor: 0.7,
    linerAirWeight: enhancedResults.displacement.pipeWeightLbs,
    linerBuoyedWeight: enhancedResults.displacement.pipeWeightLbs - enhancedResults.displacement.buoyancyLbs,
    dpAirWeight: enhancedResults.displacement.pipeWeightLbs * 0.7, // Estimate
    dpBuoyedWeight: (enhancedResults.displacement.pipeWeightLbs * 0.7) - (enhancedResults.displacement.buoyancyLbs * 0.7)
  };

  const volumeCalcs: VolumeCalcs = {
    linerCapacity: enhancedResults.capacities.linerInternal,
    dpCapacity: enhancedResults.capacities.dp1Internal,
    annulusVolume: (enhancedResults.geometry.ratHoleFt + enhancedResults.geometry.annulusToLcFt) * enhancedResults.capacities.openHoleAnnulus,
    totalCementRequired: enhancedResults.totalCementVolumeBbl,
    stringDisplacement: enhancedResults.displacement.totalDisplacementBbl
  };

  const hydrostaticPressure: HydrostaticPressureCalcs = {
    mudPressureAtLinerTop: enhancedResults.inputs.mud.ppg * 0.052 * enhancedResults.inputs.casing.tvd,
    mudPressureAtLinerShoe: enhancedResults.inputs.mud.ppg * 0.052 * enhancedResults.inputs.liner.tvd,
    cementPressureAtLinerTop: enhancedResults.plugForces.hydrostaticPsi * 0.8,
    cementPressureAtLinerShoe: enhancedResults.plugForces.hydrostaticPsi
  };

  const hookloadCalcs: HookloadCalcs = {
    initialHookload: keyResults.initialHookload,
    hookloadWithSF: keyResults.hookloadWithSF,
    postCementHookload: keyResults.postCementHookload
  };

  const stretchCalcs: StretchCalcs = {
    setdownForce: enhancedResults.inputs.setdownForceLbs,
    totalLoadOnDrillString: enhancedResults.displacement.hookloadLbs,
    drillStringCrossSection: Math.PI * Math.pow(enhancedResults.inputs.dp1.od, 2) / 4,
    stretchDueToLoad: keyResults.drillStringStretch,
    stretchInFeet: keyResults.drillStringStretch / 12
  };

  const forceAnalysis: ForceAnalysisOnLinerHanger = {
    downwardForceLinerWeight: buoyancyAndWeight.linerBuoyedWeight,
    downwardForceSetdown: enhancedResults.inputs.setdownForceLbs,
    upwardForceCementBuoyancy: enhancedResults.displacement.buoyancyLbs,
    netDownwardForce: keyResults.netForceOnLinerHanger,
    netForceWithSF: keyResults.netForceWithSF
  };

  const uTubeEffect: UTubeEffectCalcs = {
    pressureDiffAtSurface: keyResults.uTubePressureDifferential,
    criticalPumpRate: keyResults.criticalPumpRate
  };

  const volumes: VolumeOperations = {
    cementVolume: enhancedResults.totalCementVolumeBbl,
    displacementVolume: enhancedResults.displacement.displacementVolumeBbl,
    plugDrop: enhancedResults.displacement.spacerVolumeBbl,
    totalWellVolume: volumeCalcs.annulusVolume + (enhancedResults.inputs.liner.length * enhancedResults.capacities.linerInternal),
    linerDisplacementVolume: enhancedResults.inputs.liner.length * enhancedResults.capacities.linerInternal,
    surfaceToShoe: enhancedResults.inputs.casing.md * enhancedResults.capacities.linerInternal
  };

  const operations: CementOperations = {
    waitOnCement: enhancedResults.inputs.holeOverlap.cementThickeningTimeMin,
    cementTravelTime: enhancedResults.totalCementVolumeBbl / 8.0, // Assume 8 bpm
    circulationRate: 8.0
  };

  return {
    keyCalculations: stepByStepCalculations,
    cementForceCalcs: {
      table: enhancedResults.cementSegments.map(segment => ({
        fluid: segment.label,
        annulusPpg: segment.ppg,
        insidePpg: enhancedResults.inputs.mud.ppg,
        deltaTvd: Math.abs(segment.topTvd - segment.bottomTvd),
        direction: 'Down',
        force: segment.volumeBbl * segment.ppg * 42 // Convert to force estimate
      }))
    },
    jobSummary,
    keyResults,
    safetyStatus,
    buoyancyAndWeight,
    volumeCalcs,
    hydrostaticPressure,
    hookloadCalcs,
    stretchCalcs,
    forceAnalysis,
    uTubeEffect,
    volumes,
    operations,
    keyVolumes: [
      { length: enhancedResults.inputs.liner.length, bblFt: enhancedResults.capacities.linerInternal, volume: enhancedResults.inputs.liner.length * enhancedResults.capacities.linerInternal },
      { length: enhancedResults.geometry.ratHoleFt, bblFt: enhancedResults.capacities.openHoleAnnulus, volume: enhancedResults.geometry.ratHoleFt * enhancedResults.capacities.openHoleAnnulus }
    ],
    cementForces: {
      table: enhancedResults.cementSegments.map(segment => ({
        fluid: segment.label,
        annulusPpg: segment.ppg,
        insidePpg: enhancedResults.inputs.mud.ppg,
        deltaTvd: Math.abs(segment.topTvd - segment.bottomTvd),
        direction: 'Down',
        force: segment.volumeBbl * segment.ppg * 42
      })),
      originalBuoyedWeight: buoyancyAndWeight.linerBuoyedWeight,
      finalBuoyedWeight: buoyancyAndWeight.linerBuoyedWeight + enhancedResults.plugForces.bumpForceLbs,
      totalForceChange: enhancedResults.plugForces.bumpForceLbs,
      totalUTubePsi: enhancedResults.plugForces.hydrostaticPsi,
      shoeDifferentialPsi: enhancedResults.plugForces.hydrostaticPsi * 0.8
    },
    plots: previousPlots || [],
    torqueDragResult: previousTorqueDrag || null,
    torqueDragRotate: previousTorqueDrag || null,
    torqueDragNoRotate: null
  };
}
