// ============================================================================
// === Main Component: WellAnalysisReport =====================================
// Combines schematic, key metrics, plug travel, fluid volumes, warnings, and
// step-by-step calculation snapshot with PDF export capability.
// ============================================================================
/* cSpell:words hookload Hookload setdown HWDP autotable jspdf reacttoprint */
import React, { useMemo, useState, useRef } from 'react';
import { ArrowDown, ArrowUp, Printer, Layers, Gauge, Zap, Droplet, Beaker, Wrench, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PipeConfig, HoleOverlapConfig, Fluid, Depth } from '../types';
import type { EnhancedCalculationResults } from '../services/enhancedCalculationEngine';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Props ------------------------------------------------------------------
interface WellAnalysisReportProps {
  casing: PipeConfig;
  liner: PipeConfig;
  dp1: PipeConfig;
  spacers: Fluid[];
  cements: Fluid[];
  displacements: Fluid[];
  holeOverlap: HoleOverlapConfig;
  landingCollar: Depth;
  totalDepth: Depth;
  calculations: EnhancedCalculationResults | null;
}

// --- Constants & Configurations --------------------------------------------
const COLORS = {
  cement: '#a16207',
  spacer: '#0ea5e9',
  mud: '#1e3a8a',
  drillPipe: '#334155',
  annulusBg: '#e5e7eb',
  forceUp: '#16a34a',
  forceDown: '#dc2626'
};

// --- Types ------------------------------------------------------------------
interface FluidLevel { top: number; bottom: number; color: string; label: string; }

// --- Utility Functions ------------------------------------------------------
const bblPerFtAnnular = (od: number, id: number) => ((Math.pow(od,2)-Math.pow(id,2))*0.785)/1029.4;

const calcFluidLevels = (cements: Fluid[], spacers: Fluid[], linerShoe: number, casingShoe: number, surface: number, ohCap: number, overlapCap: number): { fluidLevels: FluidLevel[]; tocMd: number } => {
  const fluidLevels: FluidLevel[] = [];
  let currentDepth = linerShoe;
  let tocMd = linerShoe;
  const ordered = [...cements, ...spacers];
  const colorFor = (label: string) => label.toLowerCase().includes('cement') ? COLORS.cement : COLORS.spacer;
  const fillOpenHole = (remaining: number, label: string): number => {
    if (currentDepth <= casingShoe || remaining <= 0) return remaining;
    const ohHeight = currentDepth - casingShoe;
    const ohVol = ohHeight * ohCap;
    const color = colorFor(label);
    if (remaining <= ohVol) {
      const filledHeight = remaining / ohCap;
      const top = currentDepth - filledHeight;
      fluidLevels.push({ top, bottom: currentDepth, color, label });
      currentDepth = top;
      return 0;
    }
    fluidLevels.push({ top: casingShoe, bottom: currentDepth, color, label });
    currentDepth = casingShoe;
    return remaining - ohVol;
  };
  const fillOverlap = (remaining: number, label: string) => {
    if (remaining <= 0 || currentDepth > casingShoe) return;
    const filledHeight = remaining / overlapCap;
    const top = currentDepth - filledHeight;
    fluidLevels.push({ top, bottom: currentDepth, color: colorFor(label), label });
    currentDepth = top;
  };
  for (const f of ordered) {
    let remaining = parseFloat(f.volume || '0');
    if (!remaining) continue;
    remaining = fillOpenHole(remaining, f.label);
    fillOverlap(remaining, f.label);
    if (f.label.toLowerCase().includes('cement')) tocMd = currentDepth;
  }
  if (currentDepth > surface) {
    fluidLevels.push({ top: surface, bottom: currentDepth, color: COLORS.mud, label: 'Drilling Mud' });
  }
  return { fluidLevels, tocMd };
};

// --- Subcomponents ----------------------------------------------------------
const DepthLabel: React.FC<{ y: number; depth: number; label: string; align?: 'left'|'right'; center: number; casingWidth: number; }> = ({ y, depth, label, align='left', center, casingWidth }) => {
  const x1 = align==='left'? center + casingWidth/2 + 5 : center - casingWidth/2 -5;
  const x2 = align==='left'? center + 140 : center - 140;
  const textX = align==='left'? x2 + 4 : x2 -4;
  const anchor = align==='left'? 'start':'end';
  return <g>
    <line x1={x1} y1={y} x2={x2} y2={y} stroke="#475569" strokeWidth={1} strokeDasharray="3,3" />
    <text x={textX} y={y+4} textAnchor={anchor} className="fill-slate-700 text-[10px] font-semibold">{label}: {depth.toFixed(0)} ft</text>
  </g>;
};

// Status color helper
const jobStatusColorClass = (status: string) => {
  if (status === 'success') return 'text-green-600';
  if (status === 'warning') return 'text-yellow-600';
  return 'text-red-600';
};

// Metrics panel
const KeyMetrics: React.FC<{ calculations: EnhancedCalculationResults | null; tocMd: number }> = ({ calculations, tocMd }) => {
  if (!calculations) return <p className="text-xs text-slate-500">No calculation results.</p>;
  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between"><span>TOC (MD)</span><span className="font-semibold">{tocMd.toFixed(0)} ft</span></div>
      <div className="flex justify-between"><span>Total Cement</span><span className="font-semibold">{calculations.totalCementVolumeBbl.toFixed(1)} bbl</span></div>
      <div className="flex justify-between"><span>Excess Cement</span><span className="font-semibold">{calculations.excessCementBbl.toFixed(1)} bbl</span></div>
      <div className="flex justify-between"><span>Rig Capacity Margin</span><span className="font-semibold">{calculations.rigCapacityMarginLbs.toFixed(0)} lbs</span></div>
      <div className="flex justify-between"><span>Force Margin</span><span className="font-semibold">{calculations.forceMarginPct.toFixed(1)} %</span></div>
      {calculations.plugTravel && <>
        <div className="mt-2 font-semibold text-slate-600">Plug / Dart Travel</div>
        <div className="flex justify-between"><span>Dart Launch Vol</span><span className="font-semibold">{calculations.plugTravel.dartLaunchVolumeBbl.toFixed(2)} bbl</span></div>
        <div className="flex justify-between"><span>Latch MD</span><span className="font-semibold">{calculations.plugTravel.latchMd.toFixed(1)} ft</span></div>
        <div className="flex justify-between"><span>Shear Success</span><span className={`font-semibold ${calculations.plugTravel.shearSuccess? 'text-green-600':'text-red-600'}`}>{calculations.plugTravel.shearSuccess? 'Yes':'No'}</span></div>
        <div className="flex justify-between"><span>Bump Reached</span><span className={`font-semibold ${calculations.plugTravel.bumpReached? 'text-green-600':'text-red-600'}`}>{calculations.plugTravel.bumpReached? 'Yes':'No'}</span></div>
      </>}
    </div>
  );
};

// --- Main Component Logic ---------------------------------------------------
const WellAnalysisReport: React.FC<WellAnalysisReportProps> = ({ casing, liner, dp1, spacers, cements, displacements, holeOverlap, landingCollar, totalDepth, calculations }) => {
  const [showForces, setShowForces] = useState(true);
  const [showPressures, setShowPressures] = useState(true);
  const [showSteps, setShowSteps] = useState(true);
  const [showVolumes, setShowVolumes] = useState(true);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Derived numeric values
  const casingOd = parseFloat(casing.od||'0');
  const linerOd = parseFloat(liner.od||'0');
  const dpOd1 = parseFloat(dp1.od||'0');
  const openHoleId = parseFloat(holeOverlap.openHoleId||'0');
  const linerMd = parseFloat(liner.md||'0');
  const casingMd = parseFloat(casing.md||'0');
  const ratHole = (parseFloat(totalDepth.md||'0') - linerMd) || parseFloat(holeOverlap.ratHoleLength||'0');
  const landingCollarMd = parseFloat(landingCollar.md||'0');
  const linerOverlapFt = parseFloat(holeOverlap.linerOverlap||'0');
  const surface = 0;

  const maxDepth = linerMd + ratHole + 200; // padding
  const scale = 600 / maxDepth;

  const casingShoe = casingMd;
  const linerShoe = linerMd;
  const linerTop = calculations?.geometry.topOfLinerMd || (casingMd - linerOverlapFt);
  const tdDepth = linerShoe + ratHole;

  const holeWidth = openHoleId * 10;
  const casingWidth = casingOd * 10;
  const linerWidth = linerOd * 10;
  const dpWidth = dpOd1 * 10;
  const center = 260;

  const ohCap = bblPerFtAnnular(openHoleId, linerOd);
  const overlapCap = bblPerFtAnnular(parseFloat(casing.id||'0'), linerOd);

  const { fluidLevels, tocMd } = useMemo(()=> calcFluidLevels(cements, spacers, linerShoe, casingShoe, surface, ohCap, overlapCap), [cements, spacers, linerShoe, casingShoe, surface, ohCap, overlapCap]);

  const pieData = useMemo(()=>{
    const sum = (arr: Fluid[]) => arr.reduce((a,f)=> a + (parseFloat(f.volume||'0')||0), 0);
    return [
      { name:'Cement', value: sum(cements), color: COLORS.cement },
      { name:'Spacers', value: sum(spacers), color: COLORS.spacer },
      { name:'Displ.', value: sum(displacements), color: '#6366F1' },
    ].filter(d=>d.value>0);
  },[cements,spacers,displacements]);

  const exportPdf = () => {
    if (!calculations) return;
    const doc = new jsPDF({ unit:'pt', format:'a4' });
    let y = 40; const margin = 40;
    doc.setFontSize(16); doc.text('Liner Hanger Force Analysis Report', margin, y); y+=18;
    doc.setFontSize(10); doc.text(`Well: ${calculations.inputs.casing.md ? calculations.inputs.casing.md.toString():''}  Date: ${new Date().toISOString().split('T')[0]}`, margin, y); y+=12;
    autoTable(doc, { startY:y, head:[["Metric","Value"]], body:[
      ['TOC (MD)', tocMd.toFixed(0)+' ft'],
      ['Total Cement Volume', calculations.totalCementVolumeBbl.toFixed(1)+' bbl'],
      ['Excess Cement', calculations.excessCementBbl.toFixed(1)+' bbl'],
      ['Rig Capacity Margin', calculations.rigCapacityMarginLbs.toFixed(0)+' lbs'],
      ['Force Margin', calculations.forceMarginPct.toFixed(1)+' %'],
      calculations.plugTravel ? ['Dart Launch Vol', calculations.plugTravel.dartLaunchVolumeBbl.toFixed(2)+' bbl'] : null,
      calculations.plugTravel ? ['Latch MD', calculations.plugTravel.latchMd.toFixed(1)+' ft'] : null,
      calculations.plugTravel ? ['Shear Success', calculations.plugTravel.shearSuccess? 'Yes':'No'] : null,
      calculations.plugTravel ? ['Bump Reached', calculations.plugTravel.bumpReached? 'Yes':'No'] : null,
    ].filter(Boolean) as string[][] });
    doc.save('liner-hanger-analysis.pdf');
  };

  const netForce = calculations?.plugForces.bumpForceLbs || 0;

  // --- Rendering ------------------------------------------------------------
  return (
    <div className="space-y-6" ref={printAreaRef}>
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Gauge size={18}/> Well Analysis Report</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>setShowVolumes(v=>!v)} className="px-3 py-1 text-sm rounded bg-slate-200 hover:bg-slate-300 flex items-center gap-1"><Layers size={14}/> {showVolumes? 'Hide Volumes':'Show Volumes'}</button>
          <button onClick={()=>setShowForces(v=>!v)} className="px-3 py-1 text-sm rounded bg-slate-200 hover:bg-slate-300 flex items-center gap-1"><Wrench size={14}/> {showForces? 'Hide Forces':'Show Forces'}</button>
          <button onClick={()=>setShowPressures(v=>!v)} className="px-3 py-1 text-sm rounded bg-slate-200 hover:bg-slate-300 flex items-center gap-1"><Droplet size={14}/> {showPressures? 'Hide Pressures':'Show Pressures'}</button>
          <button onClick={()=>setShowSteps(v=>!v)} className="px-3 py-1 text-sm rounded bg-slate-200 hover:bg-slate-300 flex items-center gap-1"><Zap size={14}/> {showSteps? 'Hide Steps':'Show Steps'}</button>
          <button onClick={exportPdf} className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"><Printer size={16}/> Export PDF</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Schematic */}
        <div className="bg-white rounded-xl shadow p-4 relative overflow-hidden col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Beaker size={14}/> Well Schematic</h3>
          <div className="w-full h-[640px] relative">
            <svg width="100%" height="100%" viewBox="0 0 520 640" preserveAspectRatio="xMidYMid meet">
              {/* Hole sections */}
              <rect x={center-holeWidth/2} y={(casingShoe*scale)+40} width={holeWidth} height={(tdDepth*scale+40)-(casingShoe*scale+40)} fill="#d1d5db" />
              <rect x={center-holeWidth/2} y={(linerTop*scale)+40} width={holeWidth} height={(casingShoe-linerTop)*scale} fill="#e5e7eb" />
              <rect x={center-holeWidth/2} y={40} width={holeWidth} height={(linerTop*scale)} fill="#f3f4f6" />
              {showVolumes && fluidLevels.map((fl)=>{
                const topY = fl.top*scale+40; const botY = fl.bottom*scale+40;
                const w = (fl.bottom>casingShoe)? holeWidth - linerWidth : casingWidth - linerWidth;
                const x = (fl.bottom>casingShoe)? center - holeWidth/2 : center - casingWidth/2;
                return <g key={`${fl.label}-${fl.top}-${fl.bottom}`}>
                  <rect x={x} y={topY} width={w} height={botY-topY} fill={fl.color} fillOpacity={0.55}/>
                  <rect x={center + linerWidth/2} y={topY} width={w} height={botY-topY} fill={fl.color} fillOpacity={0.55}/>
                </g>;
              })}
              {/* Casing */}
              <rect x={center-casingWidth/2} y={40} width={casingWidth} height={casingShoe*scale} fill="none" stroke="#475569" strokeWidth={3} />
              {/* Liner */}
              <rect x={center-linerWidth/2} y={linerTop*scale+40} width={linerWidth} height={(linerShoe-linerTop)*scale} fill="none" stroke="#64748b" strokeWidth={3} />
              {/* Drill Pipe */}
              <rect x={center-dpWidth/2} y={40} width={dpWidth} height={linerShoe*scale} fill={COLORS.drillPipe} />

              {/* Depth Labels */}
              <DepthLabel y={40} depth={surface} label="Surface" center={center} casingWidth={casingWidth} />
              <DepthLabel y={linerTop*scale+40} depth={linerTop} label="Liner Top" center={center} casingWidth={casingWidth} />
              <DepthLabel y={casingShoe*scale+40} depth={casingShoe} label="Casing Shoe" center={center} casingWidth={casingWidth} />
              <DepthLabel y={linerShoe*scale+40} depth={linerShoe} label="Liner Shoe" center={center} casingWidth={casingWidth} />
              <DepthLabel y={tdDepth*scale+40} depth={tdDepth} label="TD" center={center} casingWidth={casingWidth} />
              {tocMd < linerShoe && <DepthLabel y={tocMd*scale+40} depth={tocMd} label="TOC" center={center} casingWidth={casingWidth} />}
              {landingCollarMd > 0 && <DepthLabel y={landingCollarMd*scale+40} depth={landingCollarMd} label="LC" center={center} casingWidth={casingWidth} />}

              {/* Pressures */}
              {showPressures && calculations && (
                <g>
                  <text x={center - holeWidth/2 - 12} y={linerTop*scale+34} textAnchor="end" className="fill-blue-700 text-[10px] font-bold">Pann: {calculations.plugForces.hydrostaticPsi.toFixed(0)} psi</text>
                  <text x={center - holeWidth/2 - 12} y={linerShoe*scale+34} textAnchor="end" className="fill-green-700 text-[10px] font-bold">Pins: {(calculations.plugForces.hydrostaticPsi*0.9).toFixed(0)} psi</text>
                </g>
              )}

              {/* Net Force */}
              {showForces && calculations && (
                <g transform={`translate(${center + 120}, ${linerTop*scale+20})`}>
                  <text x={0} y={-10} textAnchor="middle" className="text-[10px] font-bold fill-slate-700">Net Hanger Force</text>
                  {netForce>0 ? <ArrowDown size={20} className="text-red-500" /> : <ArrowUp size={20} className="text-green-500" />}
                  <text x={0} y={30} textAnchor="middle" className={`text-xs font-bold ${netForce>0?'fill-red-600':'fill-green-600'}`}>{Math.abs(netForce).toLocaleString(undefined,{maximumFractionDigits:0})} lbs</text>
                </g>
              )}
            </svg>
            <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm p-3 rounded shadow text-[10px] space-y-1">
              <div className="font-semibold text-slate-700 text-xs mb-1">Legend</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-600"/>Cement</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-sky-500"/>Spacer</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-900"/>Mud</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-500"/>Drill Pipe</div>
            </div>
          </div>
        </div>

        {/* Metrics & Pie */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Gauge size={14}/> Key Metrics</h3>
            <KeyMetrics calculations={calculations} tocMd={tocMd} />
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Fluid Volume Mix</h3>
            {pieData.length? <div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={70} paddingAngle={3}>
                {pieData.map(d=> <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v:number)=> v.toFixed(2)+' bbl'} />
              <Legend />
            </PieChart></ResponsiveContainer></div>: <p className="text-xs text-slate-500">No fluids.</p>}
          </div>
          {calculations?.warnings.length ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-yellow-800 mb-1 flex items-center gap-1"><AlertTriangle size={12}/>Warnings</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-yellow-700">
                {calculations.warnings.map((w)=> <li key={w}>{w}</li>)}
              </ul>
            </div>
          ): null}
        </div>
      </div>

      {showSteps && calculations && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Step-by-Step Calculation Snapshot</h3>
          <div className="grid md:grid-cols-3 gap-4 text-[11px]">
            <div>
              <h4 className="font-semibold text-slate-600 mb-1">Capacities</h4>
              <div className="space-y-0.5">
                <div className="flex justify-between"><span>Liner Int (bbl/ft)</span><span>{calculations.capacities.linerInternal.toFixed(4)}</span></div>
                <div className="flex justify-between"><span>DP1 Int (bbl/ft)</span><span>{calculations.capacities.dp1Internal.toFixed(4)}</span></div>
                <div className="flex justify-between"><span>Open Hole Ann (bbl/ft)</span><span>{calculations.capacities.openHoleAnnulus.toFixed(4)}</span></div>
                <div className="flex justify-between"><span>Overlap Ann (bbl/ft)</span><span>{calculations.capacities.linerOverlapAnnulus.toFixed(4)}</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-slate-600 mb-1">Geometry</h4>
              <div className="space-y-0.5">
                <div className="flex justify-between"><span>Top of Liner</span><span>{calculations.geometry.topOfLinerMd.toFixed(0)} ft</span></div>
                <div className="flex justify-between"><span>Rat Hole</span><span>{calculations.geometry.ratHoleFt.toFixed(0)} ft</span></div>
                <div className="flex justify-between"><span>Shoe Track</span><span>{calculations.geometry.shoeTrackFt.toFixed(0)} ft</span></div>
                <div className="flex justify-between"><span>Annulus to LC</span><span>{calculations.geometry.annulusToLcFt.toFixed(0)} ft</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-slate-600 mb-1">Plug Forces</h4>
              <div className="space-y-0.5">
                <div className="flex justify-between"><span>Hydrostatic (psi)</span><span>{calculations.plugForces.hydrostaticPsi.toFixed(0)}</span></div>
                <div className="flex justify-between"><span>Plug Force (lbs)</span><span>{calculations.plugForces.plugForceLbs.toFixed(0)}</span></div>
                <div className="flex justify-between"><span>Bump Force (lbs)</span><span>{calculations.plugForces.bumpForceLbs.toFixed(0)}</span></div>
                <div className="flex justify-between"><span>Safety Factor</span><span>{calculations.plugForces.safetyFactor.toFixed(2)}</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-slate-600 mb-1">Displacement</h4>
              <div className="space-y-0.5">
                <div className="flex justify-between"><span>Spacer Vol</span><span>{calculations.displacement.spacerVolumeBbl.toFixed(1)} bbl</span></div>
                <div className="flex justify-between"><span>Displ. Vol</span><span>{calculations.displacement.displacementVolumeBbl.toFixed(1)} bbl</span></div>
                <div className="flex justify-between"><span>Total Displ.</span><span>{calculations.displacement.totalDisplacementBbl.toFixed(1)} bbl</span></div>
              </div>
            </div>
            {calculations.plugTravel && <div>
              <h4 className="font-semibold text-slate-600 mb-1">Plug Travel</h4>
              <div className="space-y-0.5">
                <div className="flex justify-between"><span>Launch Vol</span><span>{calculations.plugTravel.dartLaunchVolumeBbl.toFixed(2)} bbl</span></div>
                <div className="flex justify-between"><span>Latch MD</span><span>{calculations.plugTravel.latchMd.toFixed(1)} ft</span></div>
                <div className="flex justify-between"><span>Bump Vol</span><span>{calculations.plugTravel.bumpVolumeBbl.toFixed(2)} bbl</span></div>
                <div className="flex justify-between"><span>Bump Reached</span><span>{calculations.plugTravel.bumpReached? 'Yes':'No'}</span></div>
              </div>
            </div>}
            <div>
              <h4 className="font-semibold text-slate-600 mb-1">Status</h4>
              <div className="space-y-0.5">
                <div className="flex justify-between"><span>Job Status</span><span className={`font-semibold capitalize ${jobStatusColorClass(calculations.jobStatus)}`}>{calculations.jobStatus}</span></div>
                <div className="flex justify-between"><span>Warnings</span><span>{calculations.warnings.length}</span></div>
                <div className="flex justify-between"><span>TOC Above Liner Shoe</span><span>{calculations.tocAboveLinerShoeFt.toFixed(0)} ft</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WellAnalysisReport;
