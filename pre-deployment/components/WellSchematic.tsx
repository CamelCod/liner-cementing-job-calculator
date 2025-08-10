

import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { PipeConfig, HoleOverlapConfig, Fluid, MudConfig, Calculations } from '../types';

interface WellSchematicProps {
  casing: PipeConfig;
  liner: PipeConfig;
  dp1: PipeConfig;
  dp2: PipeConfig;
  holeOverlap: HoleOverlapConfig;
  mud: MudConfig;
  spacers: Fluid[];
  cements: Fluid[];
  calculations: Calculations | null;
}

const WellSchematic: React.FC<WellSchematicProps> = ({ casing, liner, dp1, dp2, holeOverlap, mud, spacers, cements, calculations }) => {
    const casingOd = parseFloat(casing.od || '0');
    const linerOd = parseFloat(liner.od || '0');
    const dpOd1 = parseFloat(dp1.od || '0');
    const openHoleId = parseFloat(holeOverlap.openHoleId || '0');

    const maxDepth = (parseFloat(liner.md || '0')) + (parseFloat(holeOverlap.ratHoleLength || '0')) + 200;
    const scale = 550 / maxDepth;
    const casingMd = parseFloat(casing.md || '0');
    const linerMd = parseFloat(liner.md || '0');
    const linerOverlapFt = parseFloat(holeOverlap.linerOverlap || '0');
    const ratHoleLengthFt = parseFloat(holeOverlap.ratHoleLength || '0');
    const dp1Length = parseFloat(dp1.length || '0');
    const dp2Length = parseFloat(dp2.length || '0');

    const surfaceDepth = 0;
    const casingShoeDepth = casingMd;
    const linerTopDepth = calculations?.jobSummary.linerTopDepth || (casingMd - linerOverlapFt);
    const linerShoeDepth = linerMd;
    const tdDepth = linerShoeDepth + ratHoleLengthFt;
    const dpBottomDepth = dp1Length + dp2Length;

    const ySurface = surfaceDepth * scale + 40;
    const yCasingShoe = casingShoeDepth * scale + 40;
    const yLinerTop = linerTopDepth * scale + 40;
    const yLinerShoe = linerShoeDepth * scale + 40;
    const yTd = tdDepth * scale + 40;
    const yDpBottom = dpBottomDepth * scale + 40;

    const holeWidth = openHoleId * 10;
    const casingWidth = casingOd * 10;
    const linerWidth = linerOd * 10;
    const dpWidth1 = dpOd1 * 10;
    const schematicCenter = 200;

    const bblPerFtAnnular = (od: number, id: number) => ((Math.pow(od, 2) - Math.pow(id, 2)) * 0.785) / 1029.4;
    const ohAnnulusCapacity = bblPerFtAnnular(openHoleId, linerOd);
    const linerAnnulusCapacity = bblPerFtAnnular(parseFloat(casing.id || '0'), linerOd);

    let fluidLevels: { top: number, bottom: number, color: string, label: string }[] = [];
    let currentAnnulusDepth = linerShoeDepth; // Start filling from liner shoe upwards
    let tocMd = linerShoeDepth;

    const allAnnulusFluids = [...cements, ...spacers];

    for (const fluid of allAnnulusFluids) {
        const fluidVolume = parseFloat(fluid.volume || '0');
        if (fluidVolume === 0) continue;

        let filledHeight = 0;
        let remainingVolume = fluidVolume;

        // Fill open hole section first
        if (currentAnnulusDepth > casingShoeDepth) {
            const ohSectionHeight = currentAnnulusDepth - casingShoeDepth;
            const ohSectionVolume = ohSectionHeight * ohAnnulusCapacity;
            
            if (remainingVolume <= ohSectionVolume) {
                filledHeight = remainingVolume / ohAnnulusCapacity;
                const fluidTopDepth = currentAnnulusDepth - filledHeight;
                fluidLevels.push({ top: fluidTopDepth, bottom: currentAnnulusDepth, color: fluid.label.toLowerCase().includes('cement') ? '#a16207' : '#0ea5e9', label: fluid.label });
                currentAnnulusDepth = fluidTopDepth;
                remainingVolume = 0;
            } else {
                fluidLevels.push({ top: casingShoeDepth, bottom: currentAnnulusDepth, color: fluid.label.toLowerCase().includes('cement') ? '#a16207' : '#0ea5e9', label: fluid.label });
                currentAnnulusDepth = casingShoeDepth;
                remainingVolume -= ohSectionVolume;
            }
        }
        
        // Fill liner overlap section
        if (remainingVolume > 0 && currentAnnulusDepth <= casingShoeDepth) {
             filledHeight = remainingVolume / linerAnnulusCapacity;
             const fluidTopDepth = currentAnnulusDepth - filledHeight;
             fluidLevels.push({ top: fluidTopDepth, bottom: currentAnnulusDepth, color: fluid.label.toLowerCase().includes('cement') ? '#a16207' : '#0ea5e9', label: fluid.label });
             currentAnnulusDepth = fluidTopDepth;
        }

        if (fluid.label.toLowerCase().includes('cement')) {
            tocMd = currentAnnulusDepth;
        }
    }
    
    // Add mud on top
    if (currentAnnulusDepth > surfaceDepth) {
        fluidLevels.push({ top: surfaceDepth, bottom: currentAnnulusDepth, color: '#1e3a8a', label: 'Drilling Mud' });
    }

    const DepthLabel = ({ y, depth, label, align = 'left' }: { y: number; depth: number; label: string; align?: 'left' | 'right' }) => {
        const x1 = align === 'left' ? schematicCenter + (casingWidth / 2) + 5 : schematicCenter - (casingWidth / 2) - 5;
        const x2 = align === 'left' ? schematicCenter + 120 : schematicCenter - 120;
        const textX = align === 'left' ? x2 + 5 : x2 - 5;
        const textAnchor = align === 'left' ? 'start' : 'end';
        return (
            <>
                <line x1={x1} y1={y} x2={x2} y2={y} stroke="#475569" strokeWidth="1" strokeDasharray="3,3" />
                <text x={textX} y={y + 4} className="text-[10px] fill-slate-800 font-semibold" textAnchor={textAnchor}>{label}: {depth.toFixed(0)} ft</text>
            </>
        );
    };
    
    const PressureLabel = ({ y, inside, outside, align = 'right'}: { y: number, inside: number, outside: number, align?: 'left' | 'right' }) => {
        const x = align === 'right' ? schematicCenter - (holeWidth / 2) - 10 : schematicCenter + (holeWidth / 2) + 10;
        const textAnchor = align === 'right' ? 'end' : 'start';
        return (
             <g>
                <text x={x} y={y-6} className="text-[10px] fill-blue-700 font-bold" textAnchor={textAnchor}>
                    P<tspan dy="2" fontSize="8px">annulus</tspan>: {outside.toLocaleString(undefined, {maximumFractionDigits:0})} psi
                </text>
                 <text x={x} y={y+8} className="text-[10px] fill-green-700 font-bold" textAnchor={textAnchor}>
                    P<tspan dy="2" fontSize="8px">inside</tspan>: {inside.toLocaleString(undefined, {maximumFractionDigits:0})} psi
                </text>
             </g>
        )
    };
    
    const NetForceLabel = () => {
        if (!calculations) return null;
        const netForce = calculations.forceAnalysis.netDownwardForce;
        const isDown = netForce > 0;
        const yPos = yLinerTop - 20;

        return (
            <g transform={`translate(${schematicCenter + 90}, ${yPos})`}>
                <text x="0" y="-8" textAnchor="middle" className="text-xs font-bold fill-slate-700">Net Hanger Force</text>
                {isDown ? <ArrowDown size={20} x="-10" y="0" className="text-red-500"/> : <ArrowUp size={20} x="-10" y="0" className="text-green-500"/>}
                <text x="12" y="15" className={`text-sm font-bold ${isDown ? 'fill-red-500' : 'fill-green-500'}`}>{Math.abs(netForce).toLocaleString(undefined, {maximumFractionDigits: 0})} lbs</text>
            </g>
        )
    }

    return (
        <div className="relative bg-slate-50 rounded-xl shadow-inner p-4 flex justify-center items-start" style={{ height: '700px' }}>
            <svg width="100%" height="100%" viewBox={`0 0 400 650`} preserveAspectRatio="xMidYMid">
                {/* Wellbore Hole */}
                <rect x={schematicCenter - holeWidth/2} y={yCasingShoe} width={holeWidth} height={yTd - yCasingShoe} fill="#d1d5db" />
                <rect x={schematicCenter - holeWidth/2} y={yLinerTop} width={holeWidth} height={yCasingShoe - yLinerTop} fill="#e5e7eb" />
                <rect x={schematicCenter - holeWidth/2} y={ySurface} width={holeWidth} height={yLinerTop - ySurface} fill="#f3f4f6" />
                
                {/* Fluids in Annulus */}
                {fluidLevels.map((fluid, index) => {
                    const topY = fluid.top * scale + 40;
                    const bottomY = fluid.bottom * scale + 40;
                    let fluidWidth = (fluid.bottom > casingShoeDepth) ? holeWidth - linerWidth : casingWidth - linerWidth;
                    let fluidX = (fluid.bottom > casingShoeDepth) ? schematicCenter - holeWidth/2 : schematicCenter - casingWidth/2;
                    
                    return (
                        <g key={index}>
                          <rect x={fluidX} y={topY} width={fluidWidth} height={bottomY - topY} fill={fluid.color} fillOpacity={0.6} />
                          <rect x={schematicCenter + linerWidth / 2} y={topY} width={fluidWidth} height={bottomY - topY} fill={fluid.color} fillOpacity={0.6} />
                        </g>
                    );
                })}


                {/* Casing */}
                <rect x={schematicCenter - casingWidth/2} y={ySurface} width={casingWidth} height={yCasingShoe - ySurface} fill="none" stroke="#475569" strokeWidth="3" />
                {/* Liner */}
                <rect x={schematicCenter - linerWidth/2} y={yLinerTop} width={linerWidth} height={yLinerShoe - yLinerTop} fill="none" stroke="#64748b" strokeWidth="3" />
                {/* Drill Pipe */}
                <rect x={schematicCenter - dpWidth1/2} y={ySurface} width={dpWidth1} height={yDpBottom - ySurface} fill="#334155" />
                
                {/* Data Labels */}
                <DepthLabel y={ySurface} depth={surfaceDepth} label="Surface" align="left" />
                {calculations && <text x={schematicCenter - 60} y={ySurface + 20} className="text-xs font-bold fill-slate-700">Hookload: {calculations.keyResults.initialHookload.toLocaleString(undefined, {maximumFractionDigits:0})} lbs</text>}
                {tocMd < linerShoeDepth && <DepthLabel y={tocMd * scale + 40} depth={tocMd} label="TOC" align="left" />}
                <DepthLabel y={yLinerTop} depth={linerTopDepth} label="Liner Top" align="left"/>
                <DepthLabel y={yCasingShoe} depth={casingShoeDepth} label="Casing Shoe" align="left"/>
                <DepthLabel y={yLinerShoe} depth={linerShoeDepth} label="Liner Shoe" align="left"/>
                <DepthLabel y={yTd} depth={tdDepth} label="TD" align="left"/>
                
                {/* Pressure Labels */}
                {calculations && (
                    <>
                        <PressureLabel y={yLinerTop} inside={calculations.hydrostaticPressure.mudPressureAtLinerTop} outside={calculations.hydrostaticPressure.cementPressureAtLinerTop}/>
                        <PressureLabel y={yLinerShoe} inside={calculations.hydrostaticPressure.mudPressureAtLinerShoe} outside={calculations.hydrostaticPressure.cementPressureAtLinerShoe}/>
                    </>
                )}
                
                {/* Net Force */}
                <NetForceLabel />
            </svg>
            <div className="absolute bottom-4 right-4 bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-md border border-gray-200">
                <h4 className="font-bold text-sm mb-2 text-gray-800">Legend</h4>
                <ul className="text-xs text-slate-800 space-y-1">
                    <li className="flex items-center"><span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#a16207' }}></span>Cement</li>
                    <li className="flex items-center"><span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#0ea5e9' }}></span>Spacer</li>
                    <li className="flex items-center"><span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#1e3a8a' }}></span>Drilling Mud</li>
                    <li className="flex items-center"><span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#334155' }}></span>Drill Pipe</li>
                    <li className="flex items-center"><span className="w-3 h-3 rounded-full mr-2 border border-gray-400" style={{ backgroundColor: '#e5e7eb' }}></span>Annulus</li>
                </ul>
            </div>
        </div>
    );
};

export default WellSchematic;
