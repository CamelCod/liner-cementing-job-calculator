
import React, { useState, useEffect, useCallback, FC, ChangeEvent } from 'react';
import { Download, Calculator, Upload, Drill, FlaskConical, CircleChevronUp, CircleChevronDown, ClipboardList, MapPin, Sparkles, MessageSquareMore, ShieldAlert, LoaderCircle, TrendingUp, LocateFixed, Bot, BarChart2 } from 'lucide-react';
import type { PipeConfig, Fluid, MudConfig, SurveyRow, Calculations, ActiveTab, KeyVolumeEntry, Depth, HoleOverlapConfig, ParsedPipeConfig, PlotConfig, DeproReport, CementForceStep, CementForceSummary, CementForceComputedStep } from './types';
import * as geminiService from './services/geminiService';
import { calculateTorqueDrag } from './services/torqueDragService';
import WellSchematic from './components/WellSchematic';
import Modal from './components/Modal';
import Chart from './components/Chart';


// --- Data Tables for Casing, Liner, and Drill Pipe ---
const drillPipeData = [
    { grade: 'E-75', od: '3.500', id: '2.992', wt: '9.50' },
    { grade: 'E-75', od: '4.000', id: '3.476', wt: '11.85' },
    { grade: 'X-95', od: '4.500', id: '3.826', wt: '16.60' },
    { grade: 'G-105', od: '4.500', id: '3.670', wt: '20.00' },
    { grade: 'S-135', od: '5.000', id: '4.276', wt: '19.50' },
    { grade: 'S-135', od: '5.000', id: '4.156', wt: '25.60' },
    { grade: 'V-150', od: '5.500', id: '4.800', wt: '19.50' },
    { grade: 'L-80', od: '5.500', id: '4.670', wt: '24.70' },
    { grade: 'P-110', od: '6.625', id: '5.965', wt: '25.20' },
    { grade: 'G-105', od: '6.625', id: '5.875', wt: '28.20' },
];

const casingLinerData = [
    { od: '7.000', wt: '23.00', id: '6.276' },
    { od: '7.000', wt: '26.00', id: '6.184' },
    { od: '7.000', wt: '29.00', id: '6.094' },
    { od: '8.625', wt: '24.00', id: '7.921' },
    { od: '8.625', wt: '28.00', id: '7.825' },
    { od: '8.625', wt: '32.00', id: '7.725' },
    { od: '9.625', wt: '36.00', id: '8.921' },
    { od: '9.625', wt: '40.00', id: '8.799' },
    { od: '9.625', wt: '43.50', id: '8.681' },
    { od: '10.750', wt: '45.50', id: '9.950' },
    { od: '10.750', wt: '51.00', id: '9.760' },
];

const drillPipeGrades = ['E-75', 'X-95', 'G-105', 'S-135', 'V-150', 'L-80', 'P-110'];
const STEEL_YOUNGS_MODULUS = 30e6; // psi

// Helper Component: PipeInput with Dropdowns
interface PipeInputProps {
  label: string;
  pipe: PipeConfig;
  setPipe: React.Dispatch<React.SetStateAction<PipeConfig>>;
  pipeData: { od: string; id: string; wt: string; grade?: string }[];
  gradeOptions?: string[];
  disabled?: boolean;
}
const PipeInput: FC<PipeInputProps> = ({ label, pipe, setPipe, pipeData, gradeOptions, disabled = false }) => {
    const inputClasses = "mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 disabled:bg-slate-200 disabled:cursor-not-allowed";
    const readOnlyClasses = "mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-200 text-slate-600 cursor-not-allowed text-center";
    
    const uniqueODs = [...new Set(pipeData.map(p => p.od))];
    const filteredWeights = pipeData.filter(p => p.od === pipe.od);

    const handleODChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const newOD = e.target.value;
        const firstMatchingPipe = pipeData.find(p => p.od === newOD);
        if (firstMatchingPipe) {
            setPipe(prev => ({
                ...prev,
                od: newOD,
                wt: firstMatchingPipe.wt,
                id: firstMatchingPipe.id,
                grade: firstMatchingPipe.grade || prev.grade,
            }));
        }
    };

    const handleWtChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const newWt = e.target.value;
        const selectedPipe = pipeData.find(p => p.od === pipe.od && p.wt === newWt);
        if (selectedPipe) {
            setPipe(prev => ({
                ...prev,
                wt: newWt,
                id: selectedPipe.id,
                grade: selectedPipe.grade || prev.grade,
            }));
        }
    };

    const handleGenericChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPipe(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className={`bg-slate-50 p-4 rounded-xl shadow-inner ${disabled ? 'opacity-50' : ''}`}>
            <h3 className="text-lg font-semibold mb-4 text-slate-800">{label}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                {gradeOptions && (
                    <label className="block">
                        <span className="text-sm font-medium text-slate-600">Grade</span>
                        <select name="grade" value={pipe.grade} onChange={handleGenericChange} className={inputClasses} disabled={disabled}>
                            {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </label>
                )}
                 <label className="block">
                    <span className="text-sm font-medium text-slate-600">OD (in)</span>
                    <select name="od" value={pipe.od} onChange={handleODChange} className={inputClasses} disabled={disabled}>
                        {uniqueODs.map(od => <option key={od} value={od}>{od}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="text-sm font-medium text-slate-600">Wt (lb/ft)</span>
                    <select name="wt" value={pipe.wt} onChange={handleWtChange} className={inputClasses} disabled={disabled}>
                        {filteredWeights.map(p => <option key={`${p.wt}-${p.id}`} value={p.wt}>{p.wt}</option>)}
                    </select>
                </label>
                 <label className="block">
                    <span className="text-sm font-medium text-slate-600">ID (in)</span>
                    <span className={readOnlyClasses}>{pipe.id}</span>
                </label>
            </div>
            {(label.includes('Casing') || label.includes('Liner')) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end mt-4">
                    <label className="block col-span-2">
                        <span className="text-sm font-medium text-slate-600">Shoe MD (ft)</span>
                        <input name="md" type="number" value={pipe.md} onChange={handleGenericChange} className={inputClasses} disabled={disabled} />
                    </label>
                    <label className="block col-span-2">
                        <span className="text-sm font-medium text-slate-600">Shoe TVD (ft)</span>
                        <span className={readOnlyClasses}>{pipe.tvd}</span>
                    </label>
                </div>
            )}
            {label.includes('Drill Pipe') && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end mt-4">
                    <label className="block">
                        <span className="text-sm font-medium text-slate-600">Length (ft)</span>
                        <input name="length" type="number" value={pipe.length} onChange={handleGenericChange} className={inputClasses} disabled={disabled} />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium text-slate-600">Bottom MD (ft)</span>
                        <span className={readOnlyClasses}>{pipe.md}</span>
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium text-slate-600">Bottom TVD (ft)</span>
                        <span className={readOnlyClasses}>{pipe.tvd}</span>
                    </label>
                </div>
            )}
        </div>
    );
};

interface CalculationCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}
const CalculationCard: FC<CalculationCardProps> = ({ title, children, className }) => (
    <div className={`bg-white p-4 rounded-xl shadow-md ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">{title}</h3>
        <div className="space-y-2 text-sm">
            {children}
        </div>
    </div>
);

interface DataRowProps {
    label: string;
    value: string | number;
    unit: string;
}
const DataRow: FC<DataRowProps> = ({ label, value, unit }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-600">{label}:</span>
        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
            {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value} <span className="text-xs text-slate-500">{unit}</span>
        </span>
    </div>
);


// Main App Component
const App: FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('well-config');
    const [dpConfig, setDpConfig] = useState<'single' | 'dual'>('dual');

    const [casing, setCasing] = useState<PipeConfig>({ od: '9.625', id: '8.799', wt: '40.00', md: '5100', tvd: '5099', grade: 'P-110' });
    const [liner, setLiner] = useState<PipeConfig>({ od: '7.000', id: '6.184', wt: '29.00', md: '9280', tvd: '8463', grade: 'L-80' });
    const [dp1, setDp1] = useState<PipeConfig>({ grade: 'G-105', od: '4.500', id: '3.670', wt: '20.00', length: '5480', md: '', tvd: '' });
    const [dp2, setDp2] = useState<PipeConfig>({ grade: 'S-135', od: '5.000', id: '4.276', wt: '19.50', length: '3800', md: '', tvd: '' });
    
    const [holeOverlap, setHoleOverlap] = useState<HoleOverlapConfig>({ openHoleId: '8.5', linerOverlap: '300', shoeTrackLength: '223', cementThickeningTime: '200', rigCapacity: '500000', casingFrictionFactor: '0.25', openHoleFrictionFactor: '0.30' });
    const [landingCollar, setLandingCollar] = useState<Depth>({ md: '9057', tvd: '' });
    const [totalDepth, setTotalDepth] = useState<Depth>({ md: '9283', tvd: '' });

    const [mud, setMud] = useState<MudConfig>({ ppg: '13.00' });
    const [spacers, setSpacers] = useState<Fluid[]>([{ label: 'Spacer 1', volume: '100', ppg: '12.00' }, { label: 'Spacer 2', volume: '100', ppg: '8.42' }, { label: 'Spacer 3', volume: '100', ppg: '12.00' }]);
    const [cements, setCements] = useState<Fluid[]>([{ label: 'Lead Cement', volume: '100', ppg: '15.80' }, { label: 'Tail Cement', volume: '100', ppg: '16.70' }]);
    const [displacements, setDisplacements] = useState<Fluid[]>([{ label: 'Liner Displ. 1', volume: '100', ppg: '12.00' }, { label: 'Liner Displ. 2', volume: '100', ppg: '8.30' }, { label: 'DP Displ.', volume: '100', ppg: '11.00' }]);
    const [numSpacers, setNumSpacers] = useState(3);
    const [numCements, setNumCements] = useState(2);
    const [numDisplacements, setNumDisplacements] = useState(3);
    const [surveyData, setSurveyData] = useState<SurveyRow[]>([]);
    const [pastedSurveyText, setPastedSurveyText] = useState('');
    const [calculations, setCalculations] = useState<Calculations | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    
    // Gemini State
    const [geminiProcedure, setGeminiProcedure] = useState<string | null>(null);
    const [isGeneratingProcedure, setIsGeneratingProcedure] = useState(false);
    const [geminiRiskAssessment, setGeminiRiskAssessment] = useState<string | null>(null);
    const [isAssessingRisk, setIsAssessingRisk] = useState(false);
    const [showTermExplainer, setShowTermExplainer] = useState(false);
    const [termToExplain, setTermToExplain] = useState('');
    const [explainedTerm, setExplainedTerm] = useState('');
    const [isExplaining, setIsExplaining] = useState(false);

    // Advanced Analysis State
    const [packerForce, setPackerForce] = useState('20000');
    const [isSimulatingPacker, setIsSimulatingPacker] = useState(false);
    const [packerSimResult, setPackerSimResult] = useState<string | null>(null);
    const [torqueDragResultText, setTorqueDragResultText] = useState<string | null>(null);
    const [isAnalyzingDepro, setIsAnalyzingDepro] = useState(false);
    const [deproAnalysisResult, setDeproAnalysisResult] = useState<DeproReport | null>(null);

    // Cement Force & Hydrostatic Analysis state
    const [cementSteps, setCementSteps] = useState<CementForceStep[]>([]);
    const [cementSummary, setCementSummary] = useState<CementForceSummary | null>(null);


    const findTvdFromMd = useCallback((mdStr: string | undefined): string => {
        const md = parseFloat(mdStr || '0');
        if (surveyData.length < 2 || isNaN(md)) {
            return md > 0 ? md.toFixed(2) : '';
        }

        const data = surveyData.map(row => ({
            md: parseFloat(row[0]),
            tvd: parseFloat(row[1])
        })).sort((a, b) => a.md - b.md);

        const p1 = data.filter(p => p.md <= md).pop();
        const p2 = data.find(p => p.md >= md);

        if (p1 && p1.md === md) return p1.tvd.toFixed(2);
        if (p2 && p2.md === md) return p2.tvd.toFixed(2);

        if (p1 && p2) {
            if (p1.md === p2.md) return p1.tvd.toFixed(2);
            const slope = (p2.tvd - p1.tvd) / (p2.md - p1.md);
            const interpolatedTvd = p1.tvd + slope * (md - p1.md);
            return interpolatedTvd.toFixed(2);
        }
        
        if (p1) {
            const lastTwo = data.slice(-2);
            if (lastTwo.length === 2) {
                 const slope = (lastTwo[1].tvd - lastTwo[0].tvd) / (lastTwo[1].md - lastTwo[0].md);
                 const extrapolatedTvd = lastTwo[1].tvd + slope * (md - lastTwo[1].md);
                 return extrapolatedTvd.toFixed(2);
            }
        }
        
        if (p2) {
             const firstTwo = data.slice(0, 2);
             if (firstTwo.length === 2) {
                 const slope = (firstTwo[1].tvd - firstTwo[0].tvd) / (firstTwo[1].md - firstTwo[0].md);
                 const extrapolatedTvd = firstTwo[0].tvd + slope * (md - firstTwo[0].md);
                 return extrapolatedTvd.toFixed(2);
             }
        }

        return md.toFixed(2);
    }, [surveyData]);

    // Effect for deriving DP MDs from lengths
    useEffect(() => {
        const dp1Length = parseFloat(dp1.length || '0');
        const dp2Length = dpConfig === 'dual' ? parseFloat(dp2.length || '0') : 0;
        
        const dp1Md = dp1Length;
        const dp2Md = dp1Length + dp2Length;

        setDp1(d => ({ ...d, md: dp1Md.toString() }));
        setDp2(d => ({ ...d, md: dp2Md.toString() }));
    }, [dp1.length, dp2.length, dpConfig]);

    useEffect(() => {
        setSpacers(current => Array.from({ length: numSpacers }, (_, i) => current[i] || { label: `Spacer ${i + 1}`, volume: '100', ppg: '' }));
    }, [numSpacers]);
    useEffect(() => {
        setCements(current => Array.from({ length: numCements }, (_, i) => current[i] || { label: i === 0 ? 'Lead Cement' : `Tail Cement ${i}`, volume: '100', ppg: '' }));
    }, [numCements]);
    useEffect(() => {
        setDisplacements(current => Array.from({ length: numDisplacements }, (_, i) => current[i] || { label: `Displ. Fluid ${i + 1}`, volume: '100', ppg: '' }));
    }, [numDisplacements]);
    
    // Effect for calculating all TVDs when MDs or survey data change
    useEffect(() => {
        setCasing(c => ({ ...c, tvd: findTvdFromMd(c.md) }));
        setLiner(l => ({ ...l, tvd: findTvdFromMd(l.md) }));
        setDp1(dp => ({ ...dp, tvd: findTvdFromMd(dp.md) }));
        setDp2(dp => ({ ...dp, tvd: findTvdFromMd(dp.md) }));
        setLandingCollar(lc => ({ ...lc, tvd: findTvdFromMd(lc.md) }));
        setTotalDepth(td => ({ ...td, tvd: findTvdFromMd(td.md) }));
    }, [casing.md, liner.md, dp1.md, dp2.md, landingCollar.md, totalDepth.md, surveyData, findTvdFromMd]);


    const bblPerFt = (id: number, od: number = 0) => {
        if (od > 0) {
            return (Math.pow(od, 2) - Math.pow(id, 2)) / 1029.4; // Annular
        }
        return Math.pow(id, 2) / 1029.4; // Internal
    };
    
    const pipeArea = (id: number, od: number) => (Math.PI / 4) * (Math.pow(od, 2) - Math.pow(id, 2));
    
    const parsePipe = (pipe: PipeConfig, dpConfig: 'single' | 'dual', isDp2: boolean = false): ParsedPipeConfig => {
        const length = (isDp2 && dpConfig === 'single') ? '0' : pipe.length;
        return {
            grade: pipe.grade,
            od: parseFloat(pipe.od || '0'),
            id: parseFloat(pipe.id || '0'),
            wt: parseFloat(pipe.wt || '0'),
            length: parseFloat(length || '0'),
            md: parseFloat(pipe.md || '0'),
            tvd: parseFloat(pipe.tvd || '0'),
        };
    };

    // Helpers for Cement Force
    const areaCircleIn2 = (diameterIn: number) => (Math.PI / 4) * Math.pow(diameterIn, 2);

    const buildCementForceSteps = useCallback((): CementForceStep[] => {
        // Build a reasonable default from current fluids and geometry
        const pLiner = parsePipe(liner, dpConfig);
        const pCasing = parsePipe(casing, dpConfig);
        const pMudWeight = parseFloat(mud.ppg || '0');
        const annBblPerFt = bblPerFt(pLiner.od, parseFloat(holeOverlap.openHoleId || '0'));
        const linerIntBblPerFt = bblPerFt(pLiner.id);
        const defaultArea = areaCircleIn2(pLiner.od); // Use liner OD area, aligns with many spreadsheets

        const steps: CementForceStep[] = [];

        // Spacers inside liner vs base mud
        spacers.forEach(sp => {
            const vol = parseFloat(sp.volume || '0');
            const length_ft = linerIntBblPerFt > 0 ? vol / linerIntBblPerFt : 0;
            steps.push({
                fluid1: sp.label || 'Spacer',
                ppg1: parseFloat(sp.ppg || '0'),
                fluid2: 'Mud',
                ppg2: pMudWeight,
                length_ft,
                area_in2: defaultArea,
                direction: (parseFloat(sp.ppg || '0') >= pMudWeight) ? 'D' as const : 'U' as const,
            });
        });

        // Cements in annulus vs mud
        cements.forEach(cem => {
            const vol = parseFloat(cem.volume || '0');
            const length_ft = annBblPerFt > 0 ? vol / annBblPerFt : 0;
            steps.push({
                fluid1: cem.label || 'Cement',
                ppg1: parseFloat(cem.ppg || '0'),
                fluid2: 'Mud',
                ppg2: pMudWeight,
                length_ft,
                area_in2: defaultArea,
                direction: (parseFloat(cem.ppg || '0') >= pMudWeight) ? 'D' as const : 'U' as const,
            });
        });

        // Displacements inside liner vs mud
        displacements.forEach(df => {
            const vol = parseFloat(df.volume || '0');
            const length_ft = linerIntBblPerFt > 0 ? vol / linerIntBblPerFt : 0;
            steps.push({
                fluid1: df.label || 'Displ.',
                ppg1: parseFloat(df.ppg || '0'),
                fluid2: 'Mud',
                ppg2: pMudWeight,
                length_ft,
                area_in2: defaultArea,
                direction: (parseFloat(df.ppg || '0') >= pMudWeight) ? 'D' as const : 'U' as const,
            });
        });

        // Filter out any NaN/zero-length steps
        return steps.filter(s => s.length_ft > 0 && !isNaN(s.ppg1) && !isNaN(s.ppg2));
    }, [liner, casing, mud.ppg, spacers, cements, displacements, dpConfig, holeOverlap.openHoleId]);

    const computeCementForceSummary = useCallback((steps: CementForceStep[], originalHookLoad: number): CementForceSummary => {
        const computed = steps.map<CementForceComputedStep>(s => {
            const deltaPpg = (s.ppg1 - s.ppg2);
            const psi = deltaPpg * 0.052 * s.length_ft;
            const force = Math.abs(psi * s.area_in2);
            const forceSigned = s.direction === 'D' ? force : -force;
            return { ...s, deltaPpg, psi, force_lbf: force, forceSigned_lbf: forceSigned };
        });
        const totalDown = computed.filter(s => s.direction === 'D').reduce((a, b) => a + b.force_lbf, 0);
        const totalUp = computed.filter(s => s.direction === 'U').reduce((a, b) => a + b.force_lbf, 0);
        const uTubePsiTotal = computed.reduce((a, b) => a + b.psi, 0);
        const finalHookLoad = originalHookLoad + totalDown - totalUp;
        return {
            originalHookLoad_lbf: originalHookLoad,
            totalDown_lbf: totalDown,
            totalUp_lbf: totalUp,
            finalHookLoad_lbf: finalHookLoad,
            uTubePsiTotal,
            steps: computed,
        };
    }, []);

    const runDynamicCalculations = useCallback(() => {
        // Parse all inputs to numbers
        const pCasing = parsePipe(casing, dpConfig);
        const pLiner = parsePipe(liner, dpConfig);
        const pDp1 = parsePipe(dp1, dpConfig);
        const pDp2 = parsePipe(dp2, dpConfig, true);
        const pMudWeight = parseFloat(mud.ppg || '0');
        const pHoleOverlap = {
            openHoleId: parseFloat(holeOverlap.openHoleId || '0'),
            linerOverlap: parseFloat(holeOverlap.linerOverlap || '0'),
            shoeTrackLength: parseFloat(holeOverlap.shoeTrackLength || '0'),
            cementThickeningTime: parseFloat(holeOverlap.cementThickeningTime || '0'),
            rigCapacity: parseFloat(holeOverlap.rigCapacity || '0'),
        };
        const pTotalDepthMd = parseFloat(totalDepth.md || '0');
        const pTotalDepthTvd = parseFloat(totalDepth.tvd || '0');
        const pLandingCollarMd = parseFloat(landingCollar.md || '0');

        // --- VOLUMES & CAPACITIES ---
        const cap = {
            dp1Int: bblPerFt(pDp1.id),
            dp2Int: bblPerFt(pDp2.id),
            linerInt: bblPerFt(pLiner.id),
            ohAnn: bblPerFt(pLiner.od, pHoleOverlap.openHoleId),
            linerOverlapAnn: bblPerFt(pLiner.od, pCasing.id),
        };
        const ratHoleLength = pTotalDepthMd - pLiner.md;
        const vol = {
            dp1: pDp1.length * cap.dp1Int,
            dp2: pDp2.length * cap.dp2Int,
            liner: (pLiner.md - pCasing.md) * cap.linerInt,
            shoeTrack: pHoleOverlap.shoeTrackLength * cap.linerInt,
            ratHole: ratHoleLength * bblPerFt(pHoleOverlap.openHoleId),
            ohAnnulus: (pLiner.md - pCasing.md) * cap.ohAnn,
            linerOverlap: pHoleOverlap.linerOverlap * cap.linerOverlapAnn,
        };
        
        const keyVolumes: Calculations['keyVolumes'] = {
            dp1: { length: pDp1.length, bblFt: cap.dp1Int, volume: vol.dp1 },
            dp2: { length: pDp2.length, bblFt: cap.dp2Int, volume: vol.dp2 },
            liner: { length: (pLiner.md - pCasing.md), bblFt: cap.linerInt, volume: vol.liner },
            shoeTrack: { length: pHoleOverlap.shoeTrackLength, bblFt: cap.linerInt, volume: vol.shoeTrack },
            ratHole: { length: ratHoleLength, bblFt: bblPerFt(pHoleOverlap.openHoleId), volume: vol.ratHole },
            ohAnnulus: { length: (pLiner.md - pCasing.md), bblFt: cap.ohAnn, volume: vol.ohAnnulus },
            linerOverlap: { length: pHoleOverlap.linerOverlap, bblFt: cap.linerOverlapAnn, volume: vol.linerOverlap },
        };
        
        const detailedVolumes: Calculations['detailedVolumes'] = {
            totalAnnulus: vol.ohAnnulus + vol.linerOverlap,
            totalString: vol.dp1 + vol.dp2 + vol.liner,
            fullCycle: (vol.ohAnnulus + vol.linerOverlap) + (vol.dp1 + vol.dp2 + vol.liner),
            fullLiner: vol.liner + vol.shoeTrack + vol.ratHole,
            volumeToPumpPlug: (vol.dp1 + vol.dp2) + ((pLandingCollarMd - pCasing.md) * cap.linerInt),
        };

        // --- WEIGHTS & STRETCH ---
        const linerLengthForWeight = pLiner.md - (pCasing.md - pHoleOverlap.linerOverlap);
        const buoyancyFactor = (65.5 - pMudWeight) / 65.5;
        const airWeight = {
            liner: linerLengthForWeight * pLiner.wt,
            dp1: pDp1.length * pDp1.wt,
            dp2: pDp2.length * pDp2.wt,
        };
        const buoyedWeight = {
            liner: airWeight.liner * buoyancyFactor,
            dp1: airWeight.dp1 * buoyancyFactor,
            dp2: airWeight.dp2 * buoyancyFactor,
        };
        const hookLoad = buoyedWeight.liner + buoyedWeight.dp1 + buoyedWeight.dp2;
        const area = {
            dp1: pipeArea(pDp1.id, pDp1.od),
            dp2: pipeArea(pDp2.id, pDp2.od),
        };
        const stretchDueToLiner = 
            (buoyedWeight.liner * pDp1.length) / (area.dp1 * STEEL_YOUNGS_MODULUS) + 
            (buoyedWeight.liner * pDp2.length) / (area.dp2 * STEEL_YOUNGS_MODULUS);

        const stretchWeight: Calculations['stretchWeight'] = {
            buoyancyFactor,
            linerAirWeight: airWeight.liner,
            linerBuoyedWeight: buoyedWeight.liner,
            dpAirWeight: airWeight.dp1 + airWeight.dp2,
            dpBuoyedWeight: buoyedWeight.dp1 + buoyedWeight.dp2,
            hookLoad: hookLoad,
            stringWtAfterRelease: buoyedWeight.dp1 + buoyedWeight.dp2,
            stretchDueToLiner: stretchDueToLiner * 12, // in inches
        };
        
        // --- PRESSURES & FORCES ---
        const pressureForce: Calculations['pressureForce'] = {
            minPumpRate: pHoleOverlap.cementThickeningTime > 0 ? detailedVolumes.volumeToPumpPlug / pHoleOverlap.cementThickeningTime : 0,
            balancedHolePressure: pMudWeight * 0.052 * pLiner.tvd,
        };

        // --- LENGTHS & DEPTHS ---
        const lengthsDepths: Calculations['lengthsDepths'] = {
            linerLength: pLiner.md - (pCasing.md - pHoleOverlap.linerOverlap),
            topOfLiner: pCasing.md - pHoleOverlap.linerOverlap,
            ratHole: ratHoleLength,
        };
        
        // --- PLOTS ---
        const hookLoadAtCasingShoe = (buoyedWeight.liner + buoyedWeight.dp2) + ((pCasing.md - pDp2.md) * pDp1.wt * buoyancyFactor);

        const plots: PlotConfig[] = [
            {
                id: "volumes_by_component", type: "bar", title: "Volume by Component", x_field: "component", 
                y_fields: [{key: 'volume', name: 'Volume', color: '#3b82f6'}],
                series: [
                  { component: "DP1 Int.", volume: keyVolumes.dp1.volume },
                  { component: "DP2 Int.", volume: keyVolumes.dp2.volume },
                  { component: "Liner Int.", volume: keyVolumes.liner.volume },
                  { component: "OH Annulus", volume: keyVolumes.ohAnnulus.volume },
                  { component: "Overlap Ann.", volume: keyVolumes.linerOverlap.volume },
                ].filter(v => v.volume > 0),
                options: { xlabel: "Component", ylabel: "Volume (bbl)" }
            },
            {
                id: "base_hookload_vs_depth", type: "line", title: "Estimated Hook Load vs. Depth", x_field: "depth",
                y_fields: [{key: 'hookload', name: 'Hookload', color: '#ef4444'}],
                series: [
                  { depth: 0, hookload: 0 },
                  { depth: pCasing.md, hookload: hookLoadAtCasingShoe > 0 ? hookLoadAtCasingShoe : hookLoad * (pCasing.md / pTotalDepthMd) },
                  { depth: pTotalDepthMd, hookload: hookLoad }
                ],
                options: { 
                    xlabel: "Depth (ft)", 
                    ylabel: "Hook Load (lbs)", 
                    invert_y: true,
                    threshold_lines: [{ label: 'Rig Capacity', value: pHoleOverlap.rigCapacity, color: '#dc2626' }]
                }
            }
        ];

        const nextCalcs = { keyVolumes, detailedVolumes, stretchWeight, pressureForce, lengthsDepths, plots, torqueDragResult: null } as const;
        setCalculations(nextCalcs);
        // Auto-build cement steps and compute summary using the latest hook load
        try {
            const steps = buildCementForceSteps();
            setCementSteps(steps);
            const sum = computeCementForceSummary(steps, stretchWeight.hookLoad);
            setCementSummary(sum);
        } catch {
            // ignore, UI can still let user build manually
        }
        setActiveTab('results');
    }, [casing, liner, dp1, dp2, holeOverlap, mud, totalDepth, dpConfig, landingCollar]);

    // Recompute cement summary whenever steps change
    useEffect(() => {
        if (!calculations) return;
        if (!cementSteps || cementSteps.length === 0) { setCementSummary(null); return; }
        const original = calculations.stretchWeight.hookLoad || 0;
        setCementSummary(computeCementForceSummary(cementSteps, original));
    }, [cementSteps, calculations, computeCementForceSummary]);

    const handleProcessSurveyData = () => {
        const lines = pastedSurveyText.trim().split('\n');
        const parsedData = lines.map(line => {
            const values = line.trim().split(/[\s,\t]+/);
            return [values[0] || '0', values[1] || '0', values[2] || '0'] as SurveyRow;
        }).filter(row => row.length === 3 && row.every(val => !isNaN(parseFloat(val))));
        
        setSurveyData(parsedData);
        setModalMessage(`${parsedData.length} survey data rows processed successfully! TVD values will now be auto-calculated.`);
        setShowInfoModal(true);
    };
    
    const handleGenerateProcedure = async () => {
        setIsGeneratingProcedure(true);
        setGeminiProcedure(null);
        setGeminiRiskAssessment(null);
        const procedure = await geminiService.generateCementingProcedure({ casing, liner, holeOverlap, mud, spacers, cements, displacements });
        setGeminiProcedure(procedure);
        setIsGeneratingProcedure(false);
    };
    
    const handleRunRiskAssessment = async () => {
        setIsAssessingRisk(true);
        setGeminiProcedure(null);
        setGeminiRiskAssessment(null);
        const assessment = await geminiService.runRiskAssessment({ casing, liner, holeOverlap, mud, spacers, cements, displacements });
        setGeminiRiskAssessment(assessment);
        setIsAssessingRisk(false);
    };
    
    const handleExplainTerm = async () => {
        if (!termToExplain) return;
        setIsExplaining(true);
        setExplainedTerm('');
        const explanation = await geminiService.explainDrillingTerm(termToExplain);
        setExplainedTerm(explanation);
        setIsExplaining(false);
    };

    const handleTorqueDragAnalysis = () => {
        const pCasing = parsePipe(casing, dpConfig);
        const pLiner = parsePipe(liner, dpConfig);
        const pDp1 = parsePipe(dp1, dpConfig);
        const pDp2 = parsePipe(dp2, dpConfig, true);
        
        const string = [
            { id: 'dp1', from: 0, to: pDp1.md, od: pDp1.od, id_tube: pDp1.id, wt: pDp1.wt },
            { id: 'dp2', from: pDp1.md, to: pDp2.md, od: pDp2.od, id_tube: pDp2.id, wt: pDp2.wt },
            { id: 'liner', from: pDp2.md, to: pLiner.md, od: pLiner.od, id_tube: pLiner.id, wt: pLiner.wt },
        ].filter(s => s.to > s.from);

        const result = calculateTorqueDrag({
            survey: surveyData.map(r => ({ md: parseFloat(r[0]), tvd: parseFloat(r[1]), incl: parseFloat(r[2]) })),
            string,
            mudWeight: parseFloat(mud.ppg),
            casingFriction: parseFloat(holeOverlap.casingFrictionFactor),
            openHoleFriction: parseFloat(holeOverlap.openHoleFrictionFactor),
            casingShoeMd: pCasing.md
        });
        
        setCalculations(prev => prev ? ({ ...prev, torqueDragResult: result }) : null);
        setTorqueDragResultText(result.summary);
        setActiveTab('results');
    };

    const handlePackerForceSim = async () => {
        setIsSimulatingPacker(true);
        setPackerSimResult(null);
        const result = await geminiService.simulatePackerSettingForce({ dp1, dp2, mud, surveyData, packerForce: parseFloat(packerForce) });
        setPackerSimResult(result);
        setIsSimulatingPacker(false);
    };

    const handleDeproAnalysis = async () => {
        if (!calculations) return;
        setIsAnalyzingDepro(true);
        setDeproAnalysisResult(null);
        const data = {
            inputs: { casing, liner, dp1, dp2, holeOverlap, mud, fluids: { spacers, cements, displacements }, surveyData },
            calculations
        };
        const result = await geminiService.generateDeproAnalysis(data);
        setDeproAnalysisResult(result);
        setIsAnalyzingDepro(false);
    };


    const FluidControl: FC<{label: string; count: number; setCount: React.Dispatch<React.SetStateAction<number>>}> = ({ label, count, setCount }) => (
        <div className="flex items-center justify-between p-2">
            <span className="text-slate-700">{label}</span>
            <div className="flex items-center space-x-2">
                <button aria-label={`decrease ${label}`} onClick={() => setCount(Math.max(0, count - 1))} className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"><CircleChevronDown size={20} /></button>
                <span className="font-bold w-4 text-center">{count}</span>
                <button aria-label={`increase ${label}`} onClick={() => setCount(count + 1)} className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"><CircleChevronUp size={20} /></button>
            </div>
        </div>
    );

    const FluidInputs: FC<{fluids: Fluid[]; setFluids: React.Dispatch<React.SetStateAction<Fluid[]>>; label: string}> = ({ fluids, setFluids, label }) => (
        <div className="bg-slate-50 p-6 rounded-xl shadow-inner flex-1 min-w-[300px]">
            <h3 className="text-lg font-semibold mb-4 text-slate-700">{label}</h3>
            {fluids.length > 0 ? fluids.map((fluid, index) => (
                <div key={`${fluid.label}-${index}`} className="p-3 bg-slate-100 rounded-lg mb-2">
                    <h4 className="font-medium text-slate-800">{fluid.label}</h4>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <label className="block relative"><span className="text-sm font-medium text-slate-600">Volume (bbl)</span><input type="number" value={fluid.volume} onChange={(e) => setFluids(prev => prev.map((f, i) => i === index ? { ...f, volume: e.target.value } : f))} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                        <label className="block relative"><span className="text-sm font-medium text-slate-600">Weight (ppg)</span><input type="number" value={fluid.ppg} onChange={(e) => setFluids(prev => prev.map((f, i) => i === index ? { ...f, ppg: e.target.value } : f))} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    </div>
                </div>
            )) : <p className="text-slate-500 text-sm">No fluids configured.</p>}
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'well-config':
                return (
                    <div className="p-6 space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-800">Well Configuration</h2>
                            <div className="flex space-x-2 p-1 rounded-full bg-slate-200">
                                <button
                                    onClick={() => setDpConfig('single')}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${dpConfig === 'single' ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:bg-slate-300'}`}
                                >
                                    Single DP
                                </button>
                                <button
                                    onClick={() => setDpConfig('dual')}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${dpConfig === 'dual' ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:bg-slate-300'}`}
                                >
                                    Dual DP (Tapered)
                                </button>
                            </div>
                        </div>

                        <PipeInput label="Parent Casing" pipe={casing} setPipe={setCasing} pipeData={casingLinerData} />
                        <PipeInput label="Liner" pipe={liner} setPipe={setLiner} pipeData={casingLinerData} />
                        <PipeInput label="Drill Pipe 1" pipe={dp1} setPipe={setDp1} pipeData={drillPipeData} gradeOptions={drillPipeGrades} />
                        <PipeInput label="Drill Pipe 2" pipe={dp2} setPipe={setDp2} pipeData={drillPipeData} gradeOptions={drillPipeGrades} disabled={dpConfig === 'single'} />

                        <div className="bg-slate-50 p-6 rounded-xl shadow-inner space-y-4">
                            <h3 className="text-lg font-semibold text-slate-700">Depths & Dimensions</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                <label className="block"><span className="text-sm font-medium text-slate-600">Open Hole ID (in)</span><input type="number" value={holeOverlap.openHoleId} onChange={(e) => setHoleOverlap({ ...holeOverlap, openHoleId: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                                <label className="block"><span className="text-sm font-medium text-slate-600">Liner Overlap (ft)</span><input type="number" value={holeOverlap.linerOverlap} onChange={(e) => setHoleOverlap({ ...holeOverlap, linerOverlap: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                                <label className="block"><span className="text-sm font-medium text-slate-600">Landing Collar MD (ft)</span><input type="number" value={landingCollar.md} onChange={(e) => setLandingCollar({...landingCollar, md: e.target.value})} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                                <label className="block"><span className="text-sm font-medium text-slate-600">Landing Collar TVD (ft)</span><span className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-200 text-slate-600 cursor-not-allowed text-center">{landingCollar.tvd}</span></label>
                                <label className="block"><span className="text-sm font-medium text-slate-600">Total Depth MD (ft)</span><input type="number" value={totalDepth.md} onChange={(e) => setTotalDepth({...totalDepth, md: e.target.value})} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                                <label className="block"><span className="text-sm font-medium text-slate-600">Total Depth TVD (ft)</span><span className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-200 text-slate-600 cursor-not-allowed text-center">{totalDepth.tvd}</span></label>
                                <label className="block"><span className="text-sm font-medium text-slate-600">Shoe Track Length (ft)</span><input type="number" value={holeOverlap.shoeTrackLength} onChange={(e) => setHoleOverlap({ ...holeOverlap, shoeTrackLength: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                                <label className="block"><span className="text-sm font-medium text-slate-600">Cement Thickening Time (min)</span><input type="number" value={holeOverlap.cementThickeningTime} onChange={(e) => setHoleOverlap({ ...holeOverlap, cementThickeningTime: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                                <label className="block col-span-2"><span className="text-sm font-medium text-slate-600">Rig Capacity (lbs)</span><input type="number" value={holeOverlap.rigCapacity} onChange={(e) => setHoleOverlap({ ...holeOverlap, rigCapacity: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                            </div>
                        </div>
                    </div>
                );
            case 'fluid-config':
                 return (
                    <div className="p-6 space-y-6 animate-fade-in">
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">Configure Fluids</h2>
                        <div className="bg-slate-50 p-6 rounded-xl shadow-inner space-y-4 max-w-md mx-auto">
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">Number of Fluids</h3>
                            <FluidControl label="Spacers" count={numSpacers} setCount={setNumSpacers} />
                            <FluidControl label="Cements" count={numCements} setCount={setNumCements} />
                            <FluidControl label="Displacement Fluids" count={numDisplacements} setCount={setNumDisplacements} />
                        </div>
                    </div>
                );
            case 'fluids':
                return (
                     <div className="p-6 animate-fade-in">
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">Fluid Inputs</h2>
                        <div className="flex flex-wrap gap-6">
                            <div className="bg-slate-50 p-6 rounded-xl shadow-inner flex-1 min-w-[300px]">
                                <h3 className="text-lg font-semibold text-slate-700 mb-4">Base Mud</h3>
                                <label className="block"><span className="text-sm font-medium text-slate-600">Weight (ppg)</span><input type="number" value={mud.ppg} onChange={(e) => setMud({ ppg: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                            </div>
                            <FluidInputs fluids={spacers} setFluids={setSpacers} label="Spacers" />
                            <FluidInputs fluids={cements} setFluids={setCements} label="Cements" />
                            <FluidInputs fluids={displacements} setFluids={setDisplacements} label="Displacement Fluids" />
                        </div>
                    </div>
                );
            case 'survey':
                 return (
                    <div className="p-6 space-y-6 max-w-2xl mx-auto animate-fade-in">
                        <h2 className="text-2xl font-bold text-slate-800">Paste Survey Data</h2>
                        <div className="bg-slate-50 p-6 rounded-xl shadow-inner space-y-4">
                            <label className="block"><span className="text-sm font-medium text-slate-600">Paste data here (MD, TVD, Inc. Angle)</span><textarea className="mt-1 block w-full h-40 p-2 border border-slate-300 rounded-md font-mono text-sm bg-white text-slate-900" value={pastedSurveyText} onChange={(e) => setPastedSurveyText(e.target.value)} placeholder={"e.g.,\n100 100 0.5\n200 199.8 1.2\n300 299.1 2.5"}></textarea></label>
                            <button onClick={handleProcessSurveyData} className="w-full flex items-center justify-center p-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-md"><Upload className="mr-2" size={20} /> Process Data</button>
                        </div>
                        {surveyData.length > 0 && (
                            <div className="mt-4 p-4 bg-slate-100 rounded-lg max-h-60 overflow-y-auto"><h3 className="font-semibold text-slate-700 mb-2">Survey Data Preview ({surveyData.length} rows)</h3><table className="w-full text-sm text-left text-slate-700"><thead className="text-xs text-slate-700 uppercase bg-slate-200 sticky top-0"><tr><th scope="col" className="px-6 py-3">MD</th><th scope="col" className="px-6 py-3">TVD</th><th scope="col" className="px-6 py-3">Inc.</th></tr></thead><tbody>{surveyData.map((row) => { const key = `${row[0]}-${row[1]}-${row[2]}`; return (<tr key={key} className="bg-white border-b"><td className="px-6 py-4">{row[0]}</td><td className="px-6 py-4">{row[1]}</td><td className="px-6 py-4">{row[2]}</td></tr>); })}</tbody></table></div>
                        )}
                    </div>
                );
            case 'results': {
                const ratHoleLength = (parseFloat(totalDepth.md) || 0) - (parseFloat(liner.md || '0'));
                
                let allPlots: PlotConfig[] = calculations?.plots || [];
                if (calculations?.torqueDragResult) {
                    const { plotData } = calculations.torqueDragResult;
                    allPlots.push(
                        {
                            id: "hookload_td_vs_depth",
                            type: "line",
                            title: "Hookload vs. Depth (T&D)",
                            x_field: "depth",
                            y_fields: [
                                { key: 'hookload_out', name: 'Trip Out', color: '#16a34a' },
                                { key: 'hookload_in', name: 'Trip In', color: '#ef4444' },
                            ],
                            series: plotData,
                            options: { 
                                xlabel: "Depth (ft)", 
                                ylabel: "Hook Load (lbs)", 
                                invert_y: true,
                                threshold_lines: [{ label: 'Rig Capacity', value: parseFloat(holeOverlap.rigCapacity), color: '#dc2626' }]
                            }
                        },
                        {
                            id: "torque_td_vs_depth",
                            type: "line",
                            title: "Torque vs. Depth",
                            x_field: "depth",
                            y_fields: [{ key: 'torque', name: 'Torque', color: '#6366f1' }],
                            series: plotData,
                            options: { xlabel: "Depth (ft)", ylabel: "Torque (ft-lbs)", invert_y: true }
                        }
                    );
                    // remove base hookload plot if T&D exists
                    allPlots = allPlots.filter(p => p.id !== 'base_hookload_vs_depth');
                }

                return (
                    <div className="p-6 animate-fade-in">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Calculation Results & AI Analysis</h2>
                        {!calculations ? (<div className="text-center py-10 bg-slate-50 rounded-lg"><p className="text-slate-500">Press "Run Calculation" to see results here.</p></div>) :
                        (<div>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-6">
                                    <WellSchematic casing={casing} liner={liner} dp1={dp1} dp2={dp2} holeOverlap={{...holeOverlap, ratHoleLength: ratHoleLength.toString()}} mud={mud} spacers={spacers} cements={cements} />
                                    
                                    <CalculationCard title="Key Outputs">
                                        <DataRow label="Total Annulus Volume" value={calculations.detailedVolumes.totalAnnulus} unit="bbl" />
                                        <DataRow label="Total String Volume" value={calculations.detailedVolumes.totalString} unit="bbl" />
                                        <DataRow label="Full Cycle Volume" value={calculations.detailedVolumes.fullCycle} unit="bbl" />
                                        <DataRow label="Buoyancy Factor" value={calculations.stretchWeight.buoyancyFactor} unit="" />
                                    </CalculationCard>

                                    <div className="space-y-4">
                                        <button onClick={handleGenerateProcedure} disabled={isGeneratingProcedure || isAssessingRisk} className="w-full flex items-center justify-center p-3 rounded-lg bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition-colors shadow-lg disabled:bg-purple-300"><Sparkles className="mr-2" size={20} />{isGeneratingProcedure ? <><LoaderCircle className="animate-spin mr-2"/> Generating...</> : 'Generate Cementing Procedure'}</button>
                                        <button onClick={handleRunRiskAssessment} disabled={isAssessingRisk || isGeneratingProcedure} className="w-full flex items-center justify-center p-3 rounded-lg bg-red-600 text-white font-bold text-lg hover:bg-red-700 transition-colors shadow-lg disabled:bg-red-300"><ShieldAlert className="mr-2" size={20} />{isAssessingRisk ? <><LoaderCircle className="animate-spin mr-2"/> Assessing...</> : 'Run Risk Assessment'}</button>
                                    </div>
                                    {(geminiProcedure || geminiRiskAssessment) && (
                                        <div className={`p-6 rounded-xl shadow-md prose prose-sm max-w-none ${geminiProcedure ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
                                            <h3 className={`text-lg font-semibold mb-4 ${geminiProcedure ? 'text-purple-800' : 'text-red-800'}`}>{geminiProcedure ? 'AI-Generated Cementing Procedure' : 'AI-Generated Risk Assessment'}</h3>
                                            <div dangerouslySetInnerHTML={{ __html: geminiProcedure || geminiRiskAssessment || '' }} className="whitespace-pre-wrap font-sans"/>
                                        </div>
                                    )}
                                </div>
                                {/* Right Column */}
                                <div className="space-y-6">
                                    <CalculationCard title="Key Volumes Table" className="max-h-[28rem] overflow-y-auto">
                                        <table className="w-full text-sm text-left text-slate-700">
                                            <thead className="text-xs text-slate-700 uppercase bg-slate-200 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2">Section</th>
                                                    <th className="px-3 py-2">Length (ft)</th>
                                                    <th className="px-3 py-2">Bbl/ft</th>
                                                    <th className="px-3 py-2">Volume (bbl)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(calculations.keyVolumes).map(([key, value]) => {
                                                    const entry = value as KeyVolumeEntry;
                                                    if (key === 'dp2' && entry.length === 0) return null;
                                                    return (
                                                        <tr key={key} className="border-b bg-white">
                                                            <td className="px-3 py-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                                                            <td className="px-3 py-2">{entry.length.toFixed(0)}</td>
                                                            <td className="px-3 py-2">{entry.bblFt.toFixed(4)}</td>
                                                            <td className="px-3 py-2">{entry.volume.toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </CalculationCard>

                                    <CalculationCard title="Lengths & Depths">
                                        <DataRow label="Liner Length" value={calculations.lengthsDepths.linerLength} unit="ft" />
                                        <DataRow label="Top of Liner (TOL)" value={calculations.lengthsDepths.topOfLiner} unit="ft" />
                                        <DataRow label="Rat Hole Length" value={calculations.lengthsDepths.ratHole} unit="ft" />
                                    </CalculationCard>
                                    
                                    <CalculationCard title="Stretch & Weight">
                                        <DataRow label="Liner Air Weight" value={calculations.stretchWeight.linerAirWeight} unit="lbs" />
                                        <DataRow label="Liner Buoyed Weight" value={calculations.stretchWeight.linerBuoyedWeight} unit="lbs" />
                                        <DataRow label="DP Buoyed Weight" value={calculations.stretchWeight.dpBuoyedWeight} unit="lbs" />
                                        <DataRow label="Hook Load (Before Release)" value={calculations.stretchWeight.hookLoad} unit="lbs" />
                                        <DataRow label="String Weight (After Release)" value={calculations.stretchWeight.stringWtAfterRelease} unit="lbs" />
                                        <DataRow label="Stretch due to Liner" value={calculations.stretchWeight.stretchDueToLiner} unit="in" />
                                    </CalculationCard>
                                    
                                    <CalculationCard title="Pressure & Force Output">
                                        <DataRow label="Min Pump Rate" value={calculations.pressureForce.minPumpRate} unit="bpm" />
                                        <DataRow label="Balanced Hole Pressure" value={calculations.pressureForce.balancedHolePressure} unit="psi" />
                                    </CalculationCard>

                                    <CalculationCard title="Cement Displacement">
                                        <DataRow label="Full Liner Volume" value={calculations.detailedVolumes.fullLiner} unit="bbl" />
                                        <DataRow label="Volume to Pump Plug" value={calculations.detailedVolumes.volumeToPumpPlug} unit="bbl" />
                                    </CalculationCard>
                                    
                                    <CalculationCard title="CEMENT FORCE & Hydrostatic Analysis">
                                        <div className="mb-2 flex items-center justify-between">
                                            <button onClick={() => setCementSteps(buildCementForceSteps())} className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">Rebuild from Fluids</button>
                                        </div>
                                        {cementSummary ? (
                                            <div className="space-y-3">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left text-slate-700">
                                                        <thead className="text-xs uppercase bg-slate-200 sticky top-0">
                                                            <tr>
                                                                <th className="px-2 py-1">Fluid 1</th>
                                                                <th className="px-2 py-1">ρ1</th>
                                                                <th className="px-2 py-1">Fluid 2</th>
                                                                <th className="px-2 py-1">ρ2</th>
                                                                <th className="px-2 py-1">Δρ</th>
                                                                <th className="px-2 py-1">L (ft)</th>
                                                                <th className="px-2 py-1">A (in²)</th>
                                                                <th className="px-2 py-1">PSI</th>
                                                                <th className="px-2 py-1">Force (lbf)</th>
                                                                <th className="px-2 py-1">Dir</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {cementSummary.steps.map((s, idx) => (
                                                                <tr key={`${s.fluid1}-${s.fluid2}-${idx}`} className="border-b">
                                                                    <td className="px-2 py-1">{s.fluid1}</td>
                                                                    <td className="px-2 py-1">{s.ppg1.toFixed(2)}</td>
                                                                    <td className="px-2 py-1">{s.fluid2}</td>
                                                                    <td className="px-2 py-1">{s.ppg2.toFixed(2)}</td>
                                                                    <td className="px-2 py-1">{s.deltaPpg.toFixed(2)}</td>
                                                                    <td className="px-2 py-1">{s.length_ft.toFixed(1)}</td>
                                                                    <td className="px-2 py-1">{s.area_in2.toFixed(2)}</td>
                                                                    <td className="px-2 py-1">{s.psi.toFixed(1)}</td>
                                                                    <td className="px-2 py-1">{s.forceSigned_lbf.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                                    <td className="px-2 py-1">{s.direction}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <DataRow label="Original Hook Load" value={cementSummary.originalHookLoad_lbf} unit="lbf" />
                                                    <DataRow label="Total Down Force (D)" value={cementSummary.totalDown_lbf} unit="lbf" />
                                                    <DataRow label="Total Up Force (U)" value={-cementSummary.totalUp_lbf} unit="lbf" />
                                                    <DataRow label="Final Hook Load" value={cementSummary.finalHookLoad_lbf} unit="lbf" />
                                                    <DataRow label="U-tube Pressure Total" value={cementSummary.uTubePsiTotal} unit="psi" />
                                                    {typeof cementSummary.shoeDifferentialPsi === 'number' && (
                                                        <DataRow label="Differential @ Shoe" value={cementSummary.shoeDifferentialPsi} unit="psi" />
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-slate-500">Run calculation to populate cement force steps, or click "Rebuild from Fluids".</p>
                                        )}
                                    </CalculationCard>
                                </div>
                            </div>
                            
                            {/* Plots Section */}
                            <div className="xl:col-span-2 mt-8">
                                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><BarChart2 className="mr-2"/>Data Visualization</h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {allPlots.map(plot => <Chart key={plot.id} plot={plot} />)}
                                </div>
                            </div>
                        </div>)
                        }
                    </div>
                );
            }
            case 'advanced':
                return (
                    <div className="p-6 space-y-8 max-w-4xl mx-auto animate-fade-in">
                        <h2 className="text-2xl font-bold text-slate-800">Advanced Analysis</h2>
                        
                        {/* DEPRO Analysis */}
                        <div className="bg-slate-50 p-6 rounded-xl shadow-inner">
                            <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center"><Bot className="mr-2 text-cyan-500"/>DEPRO Expert Analysis</h3>
                            <p className="text-sm text-slate-600 mb-4">Leverage AI to analyze the calculated results in the context of the DEPRO software suite. This provides a comprehensive report covering hydraulics, torque & drag, and operational risks.</p>
                            <button onClick={handleDeproAnalysis} disabled={!calculations || isAnalyzingDepro} className="w-full flex items-center justify-center p-3 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors shadow-md disabled:bg-cyan-300 disabled:cursor-not-allowed">
                                {isAnalyzingDepro ? <><LoaderCircle className="animate-spin mr-2"/>Generating Report...</> : 'Generate DEPRO Analysis'}
                            </button>
                            {deproAnalysisResult && (
                                <div className="mt-6 p-6 bg-white rounded-lg shadow-md">
                                    <h3 className="text-xl font-bold text-slate-800 mb-4 text-center">{deproAnalysisResult.title}</h3>
                                    <div className="prose prose-sm max-w-none space-y-4">
                                        {Object.entries(deproAnalysisResult).map(([key, value]) => {
                                            if (key === 'title' || !value) return null;
                                            // Create a heading from the key
                                            const heading = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                            return (
                                                <div key={key}>
                                                    <h4 className="font-semibold text-slate-700">{heading}</h4>
                                                    <div dangerouslySetInnerHTML={{ __html: (typeof value === 'string' ? value : String(value)).replace(/\[i\]/g, `<sup class="text-cyan-600 font-bold">[i]</sup>`) }} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Torque & Drag Analysis */}
                        <div className="bg-slate-50 p-6 rounded-xl shadow-inner">
                            <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center"><TrendingUp className="mr-2 text-indigo-500"/>Torque & Drag Analysis</h3>
                            <p className="text-sm text-slate-600 mb-4">Run a deterministic soft-string model to analyze torque, drag, and hookload. Requires survey data.</p>
                             <div className="grid grid-cols-2 gap-4 mb-4">
                                <label className="block">
                                    <span className="text-sm font-medium text-slate-600">Casing Friction Factor</span>
                                    <input type="number" step="0.01" value={holeOverlap.casingFrictionFactor} onChange={(e) => setHoleOverlap({ ...holeOverlap, casingFrictionFactor: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" />
                                </label>
                                 <label className="block">
                                    <span className="text-sm font-medium text-slate-600">Open Hole Friction Factor</span>
                                    <input type="number" step="0.01" value={holeOverlap.openHoleFrictionFactor} onChange={(e) => setHoleOverlap({ ...holeOverlap, openHoleFrictionFactor: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" />
                                </label>
                            </div>
                            <button onClick={handleTorqueDragAnalysis} disabled={surveyData.length < 2} className="w-full flex items-center justify-center p-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-md disabled:bg-indigo-300 disabled:cursor-not-allowed">
                                Run T&D Analysis & Generate Plots
                            </button>
                            {torqueDragResultText && (
                                <div className="mt-4 p-4 bg-white rounded-md prose prose-sm max-w-none">
                                    <div dangerouslySetInnerHTML={{ __html: torqueDragResultText.replace(/\n/g, '<br />') }} />
                                </div>
                            )}
                        </div>

                        {/* Packer Setting Force */}
                        <div className="bg-slate-50 p-6 rounded-xl shadow-inner">
                            <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center"><LocateFixed className="mr-2 text-teal-500"/>Packer Setting Force Simulation</h3>
                            <p className="text-sm text-slate-600 mb-4">Simulate the required surface slack-off weight to achieve a desired downhole force on the packer.</p>
                            <label className="block mb-4">
                                <span className="text-sm font-medium text-slate-600">Required Packer Setting Force (lbs)</span>
                                <input type="number" value={packerForce} onChange={(e) => setPackerForce(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" />
                            </label>
                            <button onClick={handlePackerForceSim} disabled={isSimulatingPacker} className="w-full flex items-center justify-center p-3 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors shadow-md disabled:bg-teal-300">
                                {isSimulatingPacker ? <><LoaderCircle className="animate-spin mr-2"/>Simulating...</> : 'Simulate Packer Force'}
                            </button>
                            {packerSimResult && (
                                <div className="mt-4 p-4 bg-white rounded-md prose prose-sm max-w-none">
                                    <div dangerouslySetInnerHTML={{ __html: packerSimResult }} />
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };
    
    const TermExplainerModal = () => (
        <Modal title="Explain a Drilling Term" onClose={() => { setShowTermExplainer(false); setExplainedTerm(''); setTermToExplain(''); }}>
            <label className="block mb-2">
                <span className="text-gray-600">Enter a term:</span>
                <input
                    type="text"
                    value={termToExplain}
                    onChange={(e) => setTermToExplain(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleExplainTerm(); }}
                    className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900"
                    placeholder="e.g., 'Rat Hole'"
                />
            </label>
            <button
                onClick={handleExplainTerm}
                className="w-full mt-2 flex items-center justify-center p-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                disabled={isExplaining || !termToExplain}
            >
                {isExplaining ? <><LoaderCircle size={16} className="animate-spin mr-2" />Thinking...</> : 'Explain Term ✨'}
            </button>
            {explainedTerm && (
                <div className="mt-4 p-4 bg-gray-100 rounded-md max-h-60 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm">{explainedTerm}</p>
                </div>
            )}
        </Modal>
    );

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800 antialiased flex flex-col md:flex-row">
            {showInfoModal && <Modal title="Information" onClose={() => setShowInfoModal(false)}><p>{modalMessage}</p><button onClick={() => setShowInfoModal(false)} className="mt-6 w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors">OK</button></Modal>}
            {showTermExplainer && <TermExplainerModal />}
            {/* Sidebar */}
            <div className="w-full md:w-72 bg-white shadow-xl p-4 flex flex-col justify-between">
                <div>
                    <h1 className="text-2xl font-bold mb-6 text-blue-700 flex items-center"><MapPin className="mr-2"/>Drilling App</h1>
                    <nav className="space-y-2">
                        <button onClick={() => setActiveTab('well-config')} className={`flex items-center w-full p-3 rounded-lg transition-colors text-left ${activeTab === 'well-config' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-slate-100'}`}><Drill className="mr-3" size={20} />Well Config</button>
                        <button onClick={() => setActiveTab('fluid-config')} className={`flex items-center w-full p-3 rounded-lg transition-colors text-left ${activeTab === 'fluid-config' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-slate-100'}`}><FlaskConical className="mr-3" size={20} />Fluid Config</button>
                        <button onClick={() => setActiveTab('fluids')} className={`flex items-center w-full p-3 rounded-lg transition-colors text-left ${activeTab === 'fluids' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-slate-100'}`}><FlaskConical className="mr-3" size={20} />Fluid Inputs</button>
                        <button onClick={() => setActiveTab('survey')} className={`flex items-center w-full p-3 rounded-lg transition-colors text-left ${activeTab === 'survey' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-slate-100'}`}><ClipboardList className="mr-3" size={20} />Paste Survey</button>
                        <button onClick={() => setActiveTab('advanced')} className={`flex items-center w-full p-3 rounded-lg transition-colors text-left ${activeTab === 'advanced' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-slate-100'}`}><TrendingUp className="mr-3" size={20} />Advanced Analysis</button>
                        <button onClick={runDynamicCalculations} className={`w-full flex items-center justify-center p-3 rounded-lg bg-green-500 text-white font-bold text-lg hover:bg-green-600 transition-colors shadow-lg mt-6`}><Calculator className="mr-2" size={20} /> Run Calculation</button>
                    </nav>
                </div>
                <div className="space-y-4 mt-6">
                    <button onClick={() => setShowTermExplainer(true)} className="w-full flex items-center justify-center p-3 rounded-lg bg-slate-500 text-white font-bold text-lg hover:bg-slate-600 transition-colors shadow-lg"><MessageSquareMore className="mr-2" size={20} /> Explain Term</button>
                    <button onClick={() => alert('Export not implemented')} className="w-full flex items-center justify-center p-3 rounded-lg bg-blue-500 text-white font-bold text-lg hover:bg-blue-600 transition-colors shadow-lg"><Download className="mr-2" size={20} /> Export Report</button>
                </div>
            </div>

            {/* Main content area */}
            <main className="flex-1 p-6 md:p-10 bg-slate-100 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-xl min-h-full">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default App;
