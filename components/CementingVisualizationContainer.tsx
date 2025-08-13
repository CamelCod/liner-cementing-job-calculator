import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { EyeOff, Settings, Zap, Play, Pause, RotateCcw, Activity, Eye } from 'lucide-react';
import type { PipeConfig, HoleOverlapConfig, Fluid, MudConfig, Depth } from '../types';
import { calculateEnhancedCementingJob, type EnhancedCalculationResults } from '../services/enhancedCalculationEngine';

// Color constants for pie chart
const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#A855F7', '#84CC16', '#F97316'];

// ============================================================================
// Props & Types
// ============================================================================

interface CementingVisualizationContainerProps {
  casing: PipeConfig;
  liner: PipeConfig;
  dp1: PipeConfig;
  dp2: PipeConfig;
  dpConfig: { includeHWDP: boolean; includeDC: boolean };
  mud: MudConfig;
  spacers: Fluid[];
  cements: Fluid[];
  displacements: Fluid[];
  holeOverlap: HoleOverlapConfig;
  landingCollar: Depth;
  totalDepth: Depth;
  setdownForce: string;
  hookloadSF: string;
  forceSF: string;
  surveyData: string[][];
  dartLaunchVolumeBbl?: string; // new optional prop
}

// Helper: status class mapping (outside component to avoid re-creation)
const statusBg: Record<string, string> = { success: 'bg-green-50', warning: 'bg-yellow-50', failure: 'bg-red-50' };
const statusText: Record<string, string> = { success: 'text-green-600', warning: 'text-yellow-600', failure: 'text-red-600' };
const statusValue: Record<string, string> = { success: 'text-green-800', warning: 'text-yellow-800', failure: 'text-red-800' };

type CalculationParams = Parameters<typeof calculateEnhancedCementingJob>[0];

const CementingVisualizationContainer: React.FC<CementingVisualizationContainerProps> = ({
  casing, liner, dp1, dp2, dpConfig, mud, spacers, cements, displacements, holeOverlap,
  landingCollar, totalDepth, setdownForce, hookloadSF, forceSF, surveyData, dartLaunchVolumeBbl
}) => {
  // ============================================================================
  // State
  // ============================================================================
  
  const [isVisualizationOpen, setIsVisualizationOpen] = useState(false);
  const [calcResults, setCalcResults] = useState<EnhancedCalculationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  
  // Animation and display controls
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showForces, setShowForces] = useState(true);
  const [showPressures, setShowPressures] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(2);
  
  // ============================================================================
  // Calculation Helpers
  // ============================================================================
  
  // Find TVD converter from survey data
  const findTvdFromMd = useCallback((md: number): number => {
    if (!surveyData?.length) return md * 0.98;
    
    let closestPoint = surveyData[0];
    if (!closestPoint?.length || !closestPoint[0]) return md * 0.98;
    
    let minDiff = Math.abs(parseFloat(closestPoint[0] || '0') - md);
    
    for (const point of surveyData) {
      if (!point || point.length < 2 || !point[0]) continue;
      const pointMd = parseFloat(point[0] || '0');
      const diff = Math.abs(pointMd - md);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    }
    
    return closestPoint.length >= 2 && closestPoint[1] 
      ? parseFloat(closestPoint[1]) 
      : md * 0.98;
  }, [surveyData]);

  // Prepare calculation inputs
  const calculationInputs: CalculationParams = useMemo(() => ({
    casing,
    liner,
    dp1,
    dp2,
  dpConfig: dpConfig.includeHWDP ? 'dual' : 'single',
    mud,
    spacers,
    cements,
    displacements,
    holeOverlap,
    landingCollarMd: parseFloat(landingCollar.md || '0'),
    totalDepthMd: parseFloat(totalDepth.md || '0'),
    setdownForceLbs: parseFloat(setdownForce) || 0,
    hookloadSF: parseFloat(hookloadSF) || 1,
    forceSF: parseFloat(forceSF) || 1,
    findTvdFromMd,
    dartLaunchVolumeBbl: parseFloat(dartLaunchVolumeBbl || '0') || 0
  }), [casing, liner, dp1, dp2, dpConfig.includeHWDP, mud, spacers, cements, displacements, holeOverlap, landingCollar.md, totalDepth.md, setdownForce, hookloadSF, forceSF, findTvdFromMd, dartLaunchVolumeBbl]);

  // ============================================================================
  // Trigger Calculation
  // ============================================================================
  useEffect(() => {
    let isCancelled = false;
    const performCalculation = async () => {
      setIsCalculating(true);
      setCalculationError(null);
      try {
        await new Promise(r => setTimeout(r, 75)); // lightweight debounce
        if (isCancelled) return;
        const results = calculateEnhancedCementingJob(calculationInputs);
        if (!isCancelled) setCalcResults(results);
      } catch (e) {
        if (!isCancelled) setCalculationError(e instanceof Error ? e.message : 'Calculation failed');
      } finally {
        if (!isCancelled) setIsCalculating(false);
      }
    };
    if (isVisualizationOpen) performCalculation();
    return () => { isCancelled = true; };
  }, [calculationInputs, isVisualizationOpen]);

  // ============================================================================
  // Animation Controls
  // ============================================================================
  
  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    setAnimationProgress(0);
  }, []);

  const pauseAnimation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const resetAnimation = useCallback(() => {
    setIsAnimating(false);
    setAnimationProgress(0);
  }, []);

  // Animation progress effect
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        const next = prev + (animationSpeed * 2);
        if (next >= 100) {
          setIsAnimating(false);
          return 100;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isAnimating, animationSpeed]);

  // ============================================================================
  // Visualization Data
  // ============================================================================
  
  const visualizationData = useMemo(() => {
    if (!calcResults) return {};
    
    return {
      tocMd: calcResults.tocMd,
      totalVolume: calcResults.totalCementVolumeBbl,
      excessVolume: calcResults.excessCementBbl,
      segments: calcResults.cementSegments?.map((seg, i) => ({
        id: `seg-${i}`,
        startMd: seg.topMd,
        endMd: seg.bottomMd,
        volume: seg.volumeBbl,
        fluidType: 'cement',
        description: seg.label,
        status: 'complete' as const,
      })) || [],
    };
  }, [calcResults]);

  // Pie chart data
  const pieChartData = useMemo(() => {
    const toNum = (v?: string | number) => {
      const n = typeof v === 'number' ? v : parseFloat(v || '0');
      return isNaN(n) ? 0 : n;
    };

    const spacerVol = spacers.reduce((a, f) => a + toNum(f.volume), 0);
    const cementVol = cements.reduce((a, f) => a + toNum(f.volume), 0);
    const dispVol = displacements.reduce((a, f) => a + toNum(f.volume), 0);

    return [
      { name: 'Spacers', value: spacerVol, color: COLORS[0] },
      { name: 'Cements', value: cementVol, color: COLORS[1] },
      { name: 'Displacement', value: dispVol, color: COLORS[2] },
    ].filter(d => d.value > 0);
  }, [spacers, cements, displacements]);

  const toggleVisualization = useCallback(() => {
    setIsVisualizationOpen(prev => !prev);
  }, []);

  // Status class helpers
  const getStatusBgClass = (s: string) => statusBg[s] || statusBg.failure;
  const getStatusTextClass = (s: string) => statusText[s] || statusText.failure;
  const getStatusValueClass = (s: string) => statusValue[s] || statusValue.failure;

  // ============================================================================
  // Render: Compact Trigger Button
  // ============================================================================
  
  if (!isVisualizationOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleVisualization}
          className="flex items-center px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-all transform hover:scale-105"
          title="Open Live Cementing Visualization"
        >
          <Zap className="mr-2" size={20} />
          Live Visualization
        </button>
      </div>
    );
  }

  // ============================================================================
  // Render: Full Modal Visualization
  // ============================================================================
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-full overflow-hidden flex flex-col">
        {/* Header Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center">
            <Zap className="mr-3" size={24} />
            <h2 className="text-xl font-bold">Live Cementing Visualization</h2>
            {isCalculating && (
              <div className="ml-3 px-3 py-1 bg-yellow-500 text-yellow-900 rounded-full text-sm font-medium">
                Calculating...
              </div>
            )}
            {calcResults && !isCalculating && (
              <div className="ml-3 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                Ready
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Animation Controls */}
            <div className="flex items-center gap-1 bg-white bg-opacity-20 rounded-lg p-1">
              <button
                onClick={startAnimation}
                disabled={isAnimating || !calcResults}
                className="p-2 rounded-md hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Start animation"
              >
                <Play className="w-4 h-4" />
              </button>
              <button
                onClick={pauseAnimation}
                disabled={!isAnimating}
                className="p-2 rounded-md hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Pause animation"
              >
                <Pause className="w-4 h-4" />
              </button>
              <button
                onClick={resetAnimation}
                className="p-2 rounded-md hover:bg-white hover:bg-opacity-20 transition-colors"
                title="Reset animation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Display Controls */}
            <div className="flex items-center space-x-2 bg-white bg-opacity-20 rounded-lg p-2">
              <button
                onClick={() => setShowForces(!showForces)}
                className={`flex items-center px-3 py-1 rounded text-sm transition-colors ${
                  showForces ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
                }`}
                title="Toggle force display"
              >
                Forces
              </button>
              <button
                onClick={() => setShowPressures(!showPressures)}
                className={`flex items-center px-3 py-1 rounded text-sm transition-colors ${
                  showPressures ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-700'
                }`}
                title="Toggle pressure display"
              >
                Pressures
              </button>
            </div>

            {/* Speed Control */}
            <div className="flex items-center space-x-2">
              <span className="text-sm">Speed:</span>
              <select
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                className="bg-white bg-opacity-20 border border-white border-opacity-30 rounded px-2 py-1 text-sm text-white"
                title="Animation speed control"
              >
                <option value={0.5} className="text-black">0.5x</option>
                <option value={1} className="text-black">1x</option>
                <option value={2} className="text-black">2x</option>
                <option value={3} className="text-black">3x</option>
              </select>
            </div>

            {/* Close Button */}
            <button
              onClick={toggleVisualization}
              className="flex items-center px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
              title="Close visualization"
            >
              <EyeOff size={18} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-full">
            
            {/* Left Panel - Key Metrics */}
            <div className="space-y-6">
              {calcResults && (
                <>
                  {/* Job Status */}
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Job Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-blue-600 font-medium">TOC MD</div>
                        <div className="text-2xl font-bold text-blue-800">{calcResults.tocMd.toFixed(0)} ft</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-green-600 font-medium">Total Cement</div>
                        <div className="text-2xl font-bold text-green-800">{calcResults.totalCementVolumeBbl.toFixed(0)} bbl</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-sm text-orange-600 font-medium">Excess Cement</div>
                        <div className="text-2xl font-bold text-orange-800">{calcResults.excessCementBbl.toFixed(0)} bbl</div>
                      </div>
                      <div className={`p-4 rounded-lg ${getStatusBgClass(calcResults.jobStatus)}`}>
                        <div className={`text-sm font-medium ${getStatusTextClass(calcResults.jobStatus)}`}>Status</div>
                        <div className={`text-lg font-bold capitalize ${getStatusValueClass(calcResults.jobStatus)}`}>{calcResults.jobStatus}</div>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {calcResults.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="text-yellow-800 font-medium mb-2 flex items-center">
                        <Settings className="w-4 h-4 mr-2" />
                        Warnings
                      </h4>
                      <ul className="list-disc list-inside space-y-1">
                        {calcResults.warnings.map((warning, index) => (
                          <li key={`warning-${warning.slice(0, 20)}-${index}`} className="text-yellow-700 text-sm">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* Fluid Volume Chart */}
              {pieChartData.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Fluid Volume Mix</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {pieChartData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 text-center text-xs text-slate-500">
                    Total: {pieChartData.reduce((a, d) => a + d.value, 0).toFixed(1)} bbl
                  </div>
                </div>
              )}
            </div>

            {/* Center Panel - Animation Progress */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Animation Progress
              </h3>
              
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(animationProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    data-progress={animationProgress}
                  />
                </div>
              </div>

              {/* Cement Segments */}
              {visualizationData.segments && visualizationData.segments.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    Cement Segments
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-auto">
                    {visualizationData.segments.map((segment) => (
                      <div
                        key={segment.id}
                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="text-sm font-medium text-gray-700">{segment.description}</div>
                        <div className="text-xs text-gray-500">
                          {segment.startMd.toFixed(0)} - {segment.endMd.toFixed(0)} ft
                        </div>
                        <div className="text-xs text-blue-600 font-medium">{segment.volume.toFixed(1)} bbl</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Forces & Pressures */}
            <div className="space-y-6">
              {calcResults && showForces && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Force Analysis</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Rig Capacity Margin:</span>
                      <span className="font-medium">{calcResults.rigCapacityMarginLbs.toFixed(0)} lbs</span>
                    </div>
                    {typeof (calcResults as any).factoredHookloadLbs === 'number' && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Factored Hookload:</span>
                        <span className="font-medium">{(calcResults as any).factoredHookloadLbs.toFixed(0)} lbs</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Force Margin:</span>
                      <span className="font-medium">{calcResults.forceMarginPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {calcResults && showPressures && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Pressure Status</h3>
                  <div className="text-sm text-gray-600">
                    <p>Pressure calculations available in detailed view</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {calculationError && (
            <div className="mx-6 mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-red-800 font-medium mb-2">Calculation Error</h4>
              <p className="text-red-700 text-sm">{calculationError}</p>
            </div>
          )}

          {/* Loading State */}
          {!calcResults && !calculationError && isCalculating && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-gray-500">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p className="text-lg font-medium">Preparing Visualization</p>
                <p className="text-sm">Live calculations in progress...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CementingVisualizationContainer;
