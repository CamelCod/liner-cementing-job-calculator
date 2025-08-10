import React, { useState, useEffect, useCallback, FC, ChangeEvent } from 'react';
import { Download, Calculator, Upload, Drill, FlaskConical, CircleChevronUp, CircleChevronDown, ClipboardList, Info, X, MapPin, Sparkles, MessageSquareMore, ShieldAlert, LoaderCircle, TrendingUp, LocateFixed, Bot, BarChart2, CheckCircle2, AlertTriangle, LayoutDashboard, Table, BrainCircuit } from 'lucide-react';
import type { 
    PipeConfig, Fluid, MudConfig, SurveyRow, Calculations, ActiveTab, KeyVolumeEntry, Depth, HoleOverlapConfig, 
    ParsedPipeConfig, PlotConfig, TorqueDragResult, DeproReport, CementForceCalcs, CementForceRow
} from './types';
import * as geminiService from './services/geminiService';
import { calculateTorqueDrag } from './services/torqueDragService';
import WellSchematic from './components/WellSchematic';
import Modal from './components/Modal';
import Chart from './components/Chart';
import FluidPieChart from './components/FluidPieChart';


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
const PSI_PER_FT_FACTOR = 0.052;

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
        <h3 className="text-base font-semibold text-slate-800 mb-3 border-b pb-2">{title}</h3>
        <div className="space-y-2 text-sm">
            {children}
        </div>
    </div>
);

interface DataRowProps {
    label: string;
    value: string | number;
    unit: string;
    className?: string;
}
const DataRow: FC<DataRowProps> = ({ label, value, unit, className }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-600">{label}:</span>
        <span className={`font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded ${className}`}>
            {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value} <span className="text-xs text-slate-500">{unit}</span>
        </span>
    </div>
);


// Main App Component
const App: FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('well-config');
    const [resultsView, setResultsView] = useState<'dashboard' | 'details' | 'ai' | 'cement'>('dashboard');
    const [dpConfig, setDpConfig] = useState<'single' | 'dual'>('dual');
    
    // New job info state
    const [wellName, setWellName] = useState('Well-123');
    const [jobDate, setJobDate] = useState(new Date().toISOString().split('T')[0]);
    const [setdownForce, setSetdownForce] = useState('20000');
    const [hookloadSF, setHookloadSF] = useState('1.25');
    const [forceSF, setForceSF] = useState('1.5');


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
    const [packerForceSimInput, setPackerForceSimInput] = useState('20000');
    const [isSimulatingPacker, setIsSimulatingPacker] = useState(false);
    const [packerSimResult, setPackerSimResult] = useState<string | null>(null);
    const [torqueDragResultText, setTorqueDragResultText] = useState<string | null>(null);
    const [isAnalyzingDepro, setIsAnalyzingDepro] = useState(false);
    const [deproAnalysisResult, setDeproAnalysisResult] = useState<DeproReport | null>(null);


    const findTvdFromMd = useCallback((mdStr: string | number | undefined): string => {
        const md = typeof mdStr === 'number' ? mdStr : parseFloat(mdStr || '0');
        if (surveyData.length < 2 || isNaN(md)) {
            return md > 0 ? md.toFixed(2) : '0';
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
    
    const parsePipe = (pipe: PipeConfig, dpConfigParam?: 'single' | 'dual', isDp2: boolean = false): ParsedPipeConfig => {
        const length = (isDp2 && (dpConfigParam || dpConfig) === 'single') ? '0' : pipe.length;
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
        const pSetdownForce = parseFloat(setdownForce) || 0;
        const pHookloadSF = parseFloat(hookloadSF) || 1.0;
        const pForceSF = parseFloat(forceSF) || 1.0;

        const pTotalDepthMd = parseFloat(totalDepth.md || '0');
        const pLandingCollarMd = parseFloat(landingCollar.md || '0');
        const topOfLinerMd = pCasing.md - pHoleOverlap.linerOverlap;
        const topOfLinerTvd = parseFloat(findTvdFromMd(topOfLinerMd));
        
        // --- Annular Fluid Columns & Hydrostatics ---
        const fluidsToPlaceAnnulus = [...cements, ...spacers];
        const annularFluidColumns: {label: string, ppg: number, topMd: number, bottomMd: number, topTvd: number, bottomTvd: number}[] = [];
        let currentAnnulusBottomMd = pLiner.md;
        const ohAnnCap = bblPerFt(pLiner.od, pHoleOverlap.openHoleId);
        const linerAnnCap = bblPerFt(pLiner.od, pCasing.id);
        
        for (const fluid of fluidsToPlaceAnnulus) {
            const fluidVolume = parseFloat(fluid.volume || '0');
            const fluidPpg = parseFloat(fluid.ppg || '0');
            if (fluidVolume <= 0 || isNaN(fluidPpg)) continue;

            let remainingVol = fluidVolume;
            let currentColumnTopMd = currentAnnulusBottomMd;
            
            if (currentColumnTopMd > pCasing.md) { // Fill Open Hole
                const ohSectionHeight = currentColumnTopMd - pCasing.md;
                const ohSectionVol = ohSectionHeight * ohAnnCap;
                const volToFill = Math.min(remainingVol, ohSectionVol);
                if (volToFill > 0) {
                    const filledHeight = volToFill / ohAnnCap;
                    currentColumnTopMd -= filledHeight;
                    remainingVol -= volToFill;
                }
            }
            if (remainingVol > 0) { // Fill Liner Overlap
                 const filledHeight = remainingVol / linerAnnCap;
                 currentColumnTopMd -= filledHeight;
            }
            
            const bottomTvd = parseFloat(findTvdFromMd(currentAnnulusBottomMd));
            const topTvd = parseFloat(findTvdFromMd(currentColumnTopMd));
            annularFluidColumns.push({ label: fluid.label, ppg: fluidPpg, topMd: currentColumnTopMd, bottomMd: currentAnnulusBottomMd, topTvd, bottomTvd });
            currentAnnulusBottomMd = currentColumnTopMd;
        }

        const getAnnularHydrostatic = (targetTvd: number): number => {
             let p = 0;
             let currentTvd = 0;
             const tocTvd = annularFluidColumns.length > 0 ? annularFluidColumns[annularFluidColumns.length - 1].topTvd : targetTvd;
             const allAnnularFluids = [{ppg: pMudWeight, topTvd: 0, bottomTvd: tocTvd}, ...annularFluidColumns];
             
             for (const col of allAnnularFluids) {
                if (currentTvd >= targetTvd) break;
                const topOfSegment = col.topTvd;
                const bottomOfSegment = col.bottomTvd;
                const heightInSegment = Math.min(targetTvd, bottomOfSegment) - topOfSegment;
                if(heightInSegment > 0){
                   p += heightInSegment * col.ppg * PSI_PER_FT_FACTOR;
                }
                currentTvd = bottomOfSegment;
             }
             return p;
        }

        // --- VOLUMES & CAPACITIES ---
        const cap = { dp1Int: bblPerFt(pDp1.id), dp2Int: bblPerFt(pDp2.id), linerInt: bblPerFt(pLiner.id), ohAnn: ohAnnCap, linerOverlapAnn: linerAnnCap };
        const ratHoleLength = pTotalDepthMd - pLiner.md;
        const linerLength = pLiner.md - topOfLinerMd;
        const ohLength = pLiner.md - pCasing.md;
        const keyVolumes: KeyVolumeEntry[] = [
            { length: pDp1.length, bblFt: cap.dp1Int, volume: pDp1.length * cap.dp1Int },
            { length: pDp2.length, bblFt: cap.dp2Int, volume: pDp2.length * cap.dp2Int },
            { length: linerLength, bblFt: cap.linerInt, volume: linerLength * cap.linerInt },
            { length: pHoleOverlap.shoeTrackLength, bblFt: cap.linerInt, volume: pHoleOverlap.shoeTrackLength * cap.linerInt },
            { length: ratHoleLength, bblFt: bblPerFt(pHoleOverlap.openHoleId), volume: ratHoleLength * bblPerFt(pHoleOverlap.openHoleId) },
            { length: ohLength, bblFt: cap.ohAnn, volume: ohLength * cap.ohAnn },
            { length: pHoleOverlap.linerOverlap, bblFt: cap.linerOverlapAnn, volume: pHoleOverlap.linerOverlap * cap.linerOverlapAnn },
        ];

        // --- WEIGHTS & BUOYANCY ---
        const buoyancyFactor = (65.5 - pMudWeight) / 65.5;
        const linerAirWeight = linerLength * pLiner.wt;
        const dpAirWeight = pDp1.length * pDp1.wt + pDp2.length * pDp2.wt;
        const linerBuoyedWeight = linerAirWeight * buoyancyFactor;
        const dpBuoyedWeight = dpAirWeight * buoyancyFactor;
        const initialHookload = linerBuoyedWeight + dpBuoyedWeight;
        const postCementHookload = dpBuoyedWeight;

        // --- STRETCH ---
        const dpArea = pipeArea(pDp1.id, pDp1.od) + (dpConfig === 'dual' ? pipeArea(pDp2.id, pDp2.od) : 0);
        const stretchDueToLiner = (linerBuoyedWeight * (pDp1.length + pDp2.length)) / (dpArea * STEEL_YOUNGS_MODULUS) * 12; // inches
        const totalLoadOnString = initialHookload;
        const stretchDueToSetdown = (pSetdownForce * (pDp1.length + pDp2.length)) / (dpArea * STEEL_YOUNGS_MODULUS) * 12; // inches

        // --- CEMENT FORCES / U-TUBE ---
        const linerOdArea = (Math.PI / 4) * Math.pow(pLiner.od, 2);
        let totalForceChange = 0;
        let totalUTubePsi = 0;
        const cementForceTable: CementForceRow[] = [];
        for (const col of annularFluidColumns) {
            const deltaTvd = col.bottomTvd - col.topTvd;
            if (deltaTvd <= 0) continue;
            const force = (col.ppg - pMudWeight) * PSI_PER_FT_FACTOR * deltaTvd * linerOdArea;
            totalForceChange += force;
            totalUTubePsi += (col.ppg - pMudWeight) * PSI_PER_FT_FACTOR * deltaTvd;
            cementForceTable.push({ fluid: col.label, annulusPpg: col.ppg, insidePpg: pMudWeight, deltaTvd, force, direction: force > 0 ? 'Down' : 'Up' });
        }
        const cementForces: CementForceCalcs = { table: cementForceTable, originalBuoyedWeight: linerBuoyedWeight, finalBuoyedWeight: linerBuoyedWeight + totalForceChange, totalForceChange, totalUTubePsi, shoeDifferentialPsi: -totalUTubePsi };

        // --- FINAL ASSEMBLY ---
        const totalCementVol = cements.reduce((acc, c) => acc + (parseFloat(c.volume) || 0), 0);
        const totalStringVol = keyVolumes.filter(kv => ['dp1', 'dp2', 'liner'].includes(kv.length.toString())).reduce((acc, kv) => acc + kv.volume, 0) + (pDp1.length * cap.dp1Int) + (pDp2.length * cap.dp2Int) + ((pLandingCollarMd - topOfLinerMd) * cap.linerInt);


        // --- PLOTS ---
        const forcePlot: PlotConfig = {
            id: 'force-analysis', type: 'bar', title: 'Force Analysis on Liner Hanger', x_field: 'force_component',
            y_fields: [{ key: 'force', name: 'Force', color: '#8884d8' }],
            series: [
                { force_component: 'Liner Buoyed Wt', force: linerBuoyedWeight, fill: '#ef4444' },
                { force_component: 'Setdown Force', force: pSetdownForce, fill: '#f87171' },
                { force_component: 'Cement Buoyancy', force: totalForceChange, fill: totalForceChange > 0 ? '#ef4444' : '#22c55e' }
            ],
            options: { xlabel: 'Force Component', ylabel: 'Force (lbs)'}
        };

        const weightPlot: PlotConfig = {
            id: 'weight-comparison', type: 'bar', title: 'Air vs. Buoyed Weight', x_field: 'pipe',
            y_fields: [
                { key: 'air', name: 'Air Weight', color: '#6366f1' },
                { key: 'buoyed', name: 'Buoyed Weight', color: '#34d399' }
            ],
            series: [
                { pipe: 'Liner', air: linerAirWeight, buoyed: linerBuoyedWeight },
                { pipe: 'Drill Pipe', air: dpAirWeight, buoyed: dpBuoyedWeight }
            ],
            options: { xlabel: 'Component', ylabel: 'Weight (lbs)' }
        };


        const calcs: Calculations = {
            jobSummary: {
                wellName,
                date: jobDate,
                linerTopDepth: topOfLinerMd,
                linerShoeDepth: pLiner.md,
                linerLength: linerLength,
            },
            keyResults: {
                initialHookload,
                hookloadWithSF: initialHookload * pHookloadSF,
                postCementHookload,
                drillStringStretch: stretchDueToLiner,
                netForceOnLinerHanger: linerBuoyedWeight + pSetdownForce + totalForceChange,
                netForceWithSF: (linerBuoyedWeight + pSetdownForce + totalForceChange) * pForceSF,
                requiredCementVolume: totalCementVol,
                uTubePressureDifferential: totalUTubePsi,
                criticalPumpRate: totalStringVol / pHoleOverlap.cementThickeningTime,
            },
            safetyStatus: {
                hookloadStatus: initialHookload < pHoleOverlap.rigCapacity ? 'OK' : 'Exceeds Rig Capacity',
                netForceStatus: `${((linerBuoyedWeight + pSetdownForce + totalForceChange) * pForceSF).toLocaleString(undefined, {maximumFractionDigits:0})} lbs`,
                stretchStatus: `${(stretchDueToLiner + stretchDueToSetdown).toFixed(2)} in`,
            },
            buoyancyAndWeight: {
                mudBuoyancyFactor: buoyancyFactor,
                spacerBuoyancyFactor: (65.5 - (parseFloat(spacers[0]?.ppg || '0'))) / 65.5,
                cementBuoyancyFactor: (65.5 - (parseFloat(cements[0]?.ppg || '0'))) / 65.5,
                linerAirWeight,
                linerBuoyedWeight,
                dpAirWeight,
                dpBuoyedWeight,
            },
            volumeCalcs: {
                linerCapacity: cap.linerInt,
                dpCapacity: cap.dp1Int, // Simplified to first DP
                annulusVolume: (ohLength * cap.ohAnn) + (pHoleOverlap.linerOverlap * cap.linerOverlapAnn),
                totalCementRequired: totalCementVol,
                stringDisplacement: (pDp1.length * cap.dp1Int) + (pDp2.length * cap.dp2Int),
            },
            hydrostaticPressure: {
                mudPressureAtLinerTop: pMudWeight * PSI_PER_FT_FACTOR * topOfLinerTvd,
                mudPressureAtLinerShoe: pMudWeight * PSI_PER_FT_FACTOR * pLiner.tvd,
                cementPressureAtLinerTop: getAnnularHydrostatic(topOfLinerTvd),
                cementPressureAtLinerShoe: getAnnularHydrostatic(pLiner.tvd),
            },
            hookloadCalcs: {
                initialHookload,
                hookloadWithSF: initialHookload * pHookloadSF,
                postCementHookload,
            },
            stretchCalcs: {
                setdownForce: pSetdownForce,
                totalLoadOnDrillString: initialHookload,
                drillStringCrossSection: dpArea,
                stretchDueToLoad: stretchDueToLiner + stretchDueToSetdown,
                stretchInFeet: (stretchDueToLiner + stretchDueToSetdown) / 12,
            },
            forceAnalysis: {
                downwardForceLinerWeight: linerBuoyedWeight,
                downwardForceSetdown: pSetdownForce,
                upwardForceCementBuoyancy: totalForceChange, // Negative value is upward force
                netDownwardForce: linerBuoyedWeight + pSetdownForce + totalForceChange,
                netForceWithSF: (linerBuoyedWeight + pSetdownForce + totalForceChange) * pForceSF,
            },
            uTubeEffect: {
                pressureDiffAtSurface: totalUTubePsi,
                criticalPumpRate: totalStringVol / pHoleOverlap.cementThickeningTime,
            },
            keyVolumes,
            cementForces,
            plots: [forcePlot, weightPlot, ...(calculations?.plots.filter(p => !['force-analysis', 'weight-comparison'].includes(p.id)) || [])],
            torqueDragResult: calculations?.torqueDragResult || null,
        };

        setCalculations(calcs);
        setActiveTab('results');
        setResultsView('dashboard');
    }, [casing, liner, dp1, dp2, holeOverlap, mud, spacers, cements, totalDepth, dpConfig, landingCollar, findTvdFromMd, wellName, jobDate, setdownForce, hookloadSF, forceSF, calculations?.torqueDragResult, calculations?.plots]);

    const handleProcessSurveyData = () => {
        const lines = pastedSurveyText.trim().split('\n');
        const parsedData = lines.map(line => {
            const values = line.trim().split(/[\s,]+/);
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
        const result = await geminiService.simulatePackerSettingForce({ dp1, dp2, mud, surveyData, packerForce: parseFloat(packerForceSimInput) });
        setPackerSimResult(result);
        setIsSimulatingPacker(false);
    };

    const handleDeproAnalysis = async () => {
        if (!calculations) return;
        setIsAnalyzingDepro(true);
        setDeproAnalysisResult(null);
        const analysisData = {
            inputs: { casing, liner, dp1, dp2, holeOverlap, mud, fluids: { spacers, cements, displacements }, surveyData },
            calculations
        };
        const result = await geminiService.generateDeproAnalysis(analysisData);
        setDeproAnalysisResult(result);
        setIsAnalyzingDepro(false);
    };


    const FluidControl: FC<{label: string; count: number; setCount: React.Dispatch<React.SetStateAction<number>>}> = ({ label, count, setCount }) => (
        <div className="flex items-center justify-between p-2">
            <span className="text-slate-700">{label}</span>
            <div className="flex items-center space-x-2">
                <button onClick={() => setCount(Math.max(0, count - 1))} aria-label={`Decrease ${label}`} title={`Decrease ${label}`} className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"><CircleChevronDown size={20} /></button>
                <span className="font-bold w-4 text-center">{count}</span>
                <button onClick={() => setCount(count + 1)} aria-label={`Increase ${label}`} title={`Increase ${label}`} className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"><CircleChevronUp size={20} /></button>
            </div>
        </div>
    );

    const FluidInputs: FC<{fluids: Fluid[]; setFluids: React.Dispatch<React.SetStateAction<Fluid[]>>; label: string}> = ({ fluids, setFluids, label }) => (
        <div className="bg-slate-50 p-6 rounded-xl shadow-inner flex-1 min-w-[300px]">
            <h3 className="text-lg font-semibold mb-4 text-slate-700">{label}</h3>
            {fluids.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {fluids.map((fluid, index) => (
                        <div key={index} className="p-3 bg-slate-100 rounded-lg">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div>
                                    <span className="text-sm font-medium text-slate-600">Fluid</span>
                                    <span className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-200 text-slate-700 text-center">
                                        {fluid.label}
                                    </span>
                                </div>
                                <label className="block">
                                    <span className="text-sm font-medium text-slate-600">Volume (bbl)</span>
                                    <input
                                        type="number"
                                        value={fluid.volume}
                                        onChange={(e) => setFluids(prev => prev.map((f, i) => i === index ? { ...f, volume: e.target.value } : f))}
                                        className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-sm font-medium text-slate-600">Weight (ppg)</span>
                                    <input
                                        type="number"
                                        value={fluid.ppg}
                                        onChange={(e) => setFluids(prev => prev.map((f, i) => i === index ? { ...f, ppg: e.target.value } : f))}
                                        className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900"
                                    />
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-slate-500 text-sm">No fluids configured.</p>
            )}
        </div>
    );

    // Cement Force Table Renderer (reusable)
    const CementForceTable: FC = () => {
        if (!calculations?.cementForces) {
            return <div className="text-slate-500 text-sm">Run calculation to generate cement force table.</div>;
        }
        const cf = calculations.cementForces;
        return (
            <div className="w-full overflow-x-auto">
                <div className="min-w-[1000px]">
                    <table className="w-full text-sm text-left text-slate-700">
                        <thead className="text-xs uppercase bg-slate-200">
                            <tr>
                                <th className="px-4 py-2">Fluid</th>
                                <th className="px-4 py-2">Annulus PPG</th>
                                <th className="px-4 py-2">Inside PPG</th>
                                <th className="px-4 py-2">ΔTVD (ft)</th>
                                <th className="px-4 py-2">Direction</th>
                                <th className="px-4 py-2">Force (lbs)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cf.table.map((row, idx) => (
                                <tr key={`${row.fluid}-${idx}`} className="bg-white border-b">
                                    <td className="px-4 py-2 whitespace-nowrap">{row.fluid}</td>
                                    <td className="px-4 py-2">{row.annulusPpg.toFixed(2)}</td>
                                    <td className="px-4 py-2">{row.insidePpg.toFixed(2)}</td>
                                    <td className="px-4 py-2">{row.deltaTvd.toFixed(0)}</td>
                                    <td className={`px-4 py-2 font-semibold ${row.direction === 'Down' ? 'text-red-600' : 'text-green-600'}`}>{row.direction}</td>
                                    <td className="px-4 py-2">{row.force.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <CalculationCard title="CEMENT FORCE & HYDROSTATIC SUMMARY">
                        <DataRow label="Original Buoyed Weight" value={cf.originalBuoyedWeight} unit="lbs" />
                        <DataRow label="Cement Force Change (±)" value={cf.totalForceChange} unit="lbs" />
                        <DataRow label="Final Buoyed Weight" value={cf.finalBuoyedWeight} unit="lbs" />
                    </CalculationCard>
                    <CalculationCard title="U-TUBE / SHOE PRESSURE">
                        <DataRow label="Total U-Tube ΔP" value={cf.totalUTubePsi} unit="psi" />
                        <DataRow label="Shoe Differential (approx)" value={cf.shoeDifferentialPsi} unit="psi" />
                    </CalculationCard>
                </div>
            </div>
        );
    };

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

                        <div className="bg-slate-50 p-6 rounded-xl shadow-inner space-y-4">
                            <h3 className="text-lg font-semibold text-slate-700">Job Information & Parameters</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                                <label className="block"><span className="text-sm font-medium text-slate-600">Well Name</span><input type="text" value={wellName} onChange={(e) => setWellName(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                                <label className="block"><span className="text-sm font-medium text-slate-600">Date</span><input type="date" value={jobDate} onChange={(e) => setJobDate(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                                <label className="block"><span className="text-sm font-medium text-slate-600">Setdown Force (lbs)</span><input type="number" value={setdownForce} onChange={(e) => setSetdownForce(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                                <label className="block"><span className="text-sm font-medium text-slate-600">Hookload SF</span><input type="number" step="0.05" value={hookloadSF} onChange={(e) => setHookloadSF(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                                <label className="block"><span className="text-sm font-medium text-slate-600">Force SF</span><input type="number" step="0.05" value={forceSF} onChange={(e) => setForceSF(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
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
                            <div className="mt-6">
                                <h4 className="text-base font-semibold text-slate-700 mb-3">CEMENT FORCE & HYDROSTATIC TABLE</h4>
                                <CementForceTable />
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
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-xl shadow-inner">
                                <h3 className="text-lg font-semibold text-slate-700 mb-4">Base Mud</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                    <div>
                                        <span className="text-sm font-medium text-slate-600">Fluid</span>
                                        <span className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-200 text-slate-700 text-center">Base Mud</span>
                                    </div>
                                    <label className="block">
                                        <span className="text-sm font-medium text-slate-600">Weight (ppg)</span>
                                        <input type="number" value={mud.ppg} onChange={(e) => setMud({ ppg: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" />
                                    </label>
                                </div>
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
                            <div className="mt-4 p-4 bg-slate-100 rounded-lg max-h-60 overflow-y-auto"><h3 className="font-semibold text-slate-700 mb-2">Survey Data Preview ({surveyData.length} rows)</h3><table className="w-full text-sm text-left text-slate-700"><thead className="text-xs text-slate-700 uppercase bg-slate-200 sticky top-0"><tr><th scope="col" className="px-6 py-3">MD</th><th scope="col" className="px-6 py-3">TVD</th><th scope="col" className="px-6 py-3">Inc.</th></tr></thead><tbody>{surveyData.map((row, index) => (<tr key={index} className="bg-white border-b"><td className="px-6 py-4">{row[0]}</td><td className="px-6 py-4">{row[1]}</td><td className="px-6 py-4">{row[2]}</td></tr>))}</tbody></table></div>
                        )}
                    </div>
                );
            case 'results': {
                const ResultTabButton: FC<{label: string; value: 'dashboard' | 'details' | 'ai' | 'cement'; icon: React.ReactNode; view: typeof resultsView; setView: typeof setResultsView}> = ({ label, value, icon, view, setView }) => (
                     <button
                        onClick={() => setView(value)}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${resultsView === value ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        {icon}
                        <span>{label}</span>
                    </button>
                );
                
                return (
                    <div className="p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">Results</h2>
                                      <div className="flex items-center space-x-2 p-1 rounded-full bg-slate-100 border">
                                          <ResultTabButton label="Dashboard" value="dashboard" icon={<LayoutDashboard size={16}/>} view={resultsView} setView={setResultsView} />
                                          <ResultTabButton label="Details" value="details" icon={<Table size={16}/>} view={resultsView} setView={setResultsView} />
                                          <ResultTabButton label="Cement Table" value="cement" icon={<Table size={16}/>} view={resultsView} setView={setResultsView} />
                                          <ResultTabButton label="AI" value="ai" icon={<BrainCircuit size={16}/>} view={resultsView} setView={setResultsView} />
                                      </div>
                        </div>

                        {!calculations ? (<div className="text-center py-10 bg-slate-50 rounded-lg"><p className="text-slate-500">Press "Run Calculation" to see results here.</p></div>) :
                        (<div>
                            {resultsView === 'dashboard' && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
                                    <div className="xl:col-span-2">
                                        <WellSchematic casing={casing} liner={liner} dp1={dp1} dp2={dp2} holeOverlap={{...holeOverlap, ratHoleLength: ((parseFloat(totalDepth.md) || 0) - (parseFloat(liner.md || '0'))).toString()}} mud={mud} spacers={spacers} cements={cements} calculations={calculations}/>
                                    </div>
                                    <div className="space-y-4">
                                        <CalculationCard title="KEY CALCULATION RESULTS">
                                            <DataRow label="Initial Hookload" value={calculations.keyResults.initialHookload} unit="lbs" />
                                            <DataRow label="Post-Cement Hookload" value={calculations.keyResults.postCementHookload} unit="lbs" />
                                            <DataRow label="Drill String Stretch" value={calculations.keyResults.drillStringStretch} unit="in" />
                                            <DataRow label="Net Force on Liner Hanger" value={calculations.keyResults.netForceOnLinerHanger} unit="lbs" />
                                            <DataRow label="U-Tube Pressure Diff" value={calculations.keyResults.uTubePressureDifferential} unit="psi" />
                                            <DataRow label="Critical Pump Rate" value={calculations.keyResults.criticalPumpRate} unit="bpm" />
                                        </CalculationCard>
                                        <CalculationCard title="SAFETY STATUS INDICATORS">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-600">Hookload Status:</span>
                                                <span className={`font-semibold px-2 py-0.5 rounded flex items-center ${calculations.safetyStatus.hookloadStatus === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {calculations.safetyStatus.hookloadStatus === 'OK' ? <CheckCircle2 size={14} className="mr-1"/> : <AlertTriangle size={14} className="mr-1"/>}
                                                    {calculations.safetyStatus.hookloadStatus}
                                                </span>
                                            </div>
                                            <DataRow label="Net Force with SF" value={calculations.safetyStatus.netForceStatus} unit="" />
                                            <DataRow label="Total Stretch" value={calculations.safetyStatus.stretchStatus} unit="" />
                                        </CalculationCard>
                                    </div>
                                    <div className="space-y-4">
                                        {calculations.plots.filter(p => p.id === 'force-analysis').map(p => <Chart key={p.id} plot={p} />)}
                                        {calculations.plots.filter(p => p.id === 'weight-comparison').map(p => <Chart key={p.id} plot={p} />)}
                                        <FluidPieChart mud={mud} spacers={spacers} cements={cements} displacements={displacements} />
                                    </div>
                                </div>
                            )}

                            {resultsView === 'details' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
                                    <CalculationCard title="JOB SUMMARY">
                                        <DataRow label="Well Name" value={calculations.jobSummary.wellName} unit="" />
                                        <DataRow label="Date" value={calculations.jobSummary.date} unit="" />
                                        <DataRow label="Liner Top Depth" value={calculations.jobSummary.linerTopDepth} unit="ft" />
                                        <DataRow label="Liner Shoe Depth" value={calculations.jobSummary.linerShoeDepth} unit="ft" />
                                        <DataRow label="Liner Length" value={calculations.jobSummary.linerLength} unit="ft" />
                                    </CalculationCard>
                                    <CalculationCard title="BUOYANCY AND WEIGHT">
                                        <DataRow label="Mud Buoyancy Factor" value={calculations.buoyancyAndWeight.mudBuoyancyFactor} unit="" />
                                        <DataRow label="Spacer Buoyancy Factor" value={calculations.buoyancyAndWeight.spacerBuoyancyFactor} unit="" />
                                        <DataRow label="Cement Buoyancy Factor" value={calculations.buoyancyAndWeight.cementBuoyancyFactor} unit="" />
                                        <hr className="my-2"/>
                                        <DataRow label="Liner Air Weight" value={calculations.buoyancyAndWeight.linerAirWeight} unit="lbs" />
                                        <DataRow label="Liner Buoyed Weight" value={calculations.buoyancyAndWeight.linerBuoyedWeight} unit="lbs" />
                                        <DataRow label="Drill Pipe Air Weight" value={calculations.buoyancyAndWeight.dpAirWeight} unit="lbs" />
                                        <DataRow label="Drill Pipe Buoyed Weight" value={calculations.buoyancyAndWeight.dpBuoyedWeight} unit="lbs" />
                                    </CalculationCard>
                                    <CalculationCard title="VOLUME CALCULATIONS">
                                        <DataRow label="Liner Capacity" value={calculations.volumeCalcs.linerCapacity} unit="bbl/ft" />
                                        <DataRow label="Drill Pipe Capacity" value={calculations.volumeCalcs.dpCapacity} unit="bbl/ft" />
                                        <DataRow label="Annulus Volume" value={calculations.volumeCalcs.annulusVolume} unit="bbl" />
                                        <DataRow label="Total Cement Required" value={calculations.volumeCalcs.totalCementRequired} unit="bbl" />
                                        <DataRow label="String Displacement" value={calculations.volumeCalcs.stringDisplacement} unit="bbl" />
                                    </CalculationCard>
                                    <CalculationCard title="HYDROSTATIC PRESSURE">
                                        <DataRow label="Mud Pressure at Liner Top" value={calculations.hydrostaticPressure.mudPressureAtLinerTop} unit="psi" />
                                        <DataRow label="Mud Pressure at Liner Shoe" value={calculations.hydrostaticPressure.mudPressureAtLinerShoe} unit="psi" />
                                        <DataRow label="Cement Pressure at Liner Top" value={calculations.hydrostaticPressure.cementPressureAtLinerTop} unit="psi" />
                                        <DataRow label="Cement Pressure at Liner Shoe" value={calculations.hydrostaticPressure.cementPressureAtLinerShoe} unit="psi" />
                                    </CalculationCard>
                                     <CalculationCard title="HOOKLOAD CALCULATIONS">
                                        <DataRow label="Initial Hookload" value={calculations.hookloadCalcs.initialHookload} unit="lbs" />
                                        <DataRow label="Hookload with SF" value={calculations.hookloadCalcs.hookloadWithSF} unit="lbs" />
                                        <DataRow label="Post-Cement Hookload" value={calculations.hookloadCalcs.postCementHookload} unit="lbs" />
                                    </CalculationCard>
                                     <CalculationCard title="STRETCH CALCULATIONS">
                                        <DataRow label="Setdown Force" value={calculations.stretchCalcs.setdownForce} unit="lbs" />
                                        <DataRow label="Total Load on Drill String" value={calculations.stretchCalcs.totalLoadOnDrillString} unit="lbs" />
                                        <DataRow label="Drill String Cross Section" value={calculations.stretchCalcs.drillStringCrossSection} unit="in²" />
                                        <DataRow label="Stretch Due to Load" value={calculations.stretchCalcs.stretchDueToLoad} unit="in" />
                                        <DataRow label="Stretch in Feet" value={calculations.stretchCalcs.stretchInFeet} unit="ft" />
                                    </CalculationCard>
                                    <CalculationCard title="FORCE ANALYSIS ON LINER HANGER">
                                        <DataRow label="Downward Force - Liner Wt" value={calculations.forceAnalysis.downwardForceLinerWeight} unit="lbs" className="text-red-600"/>
                                        <DataRow label="Downward Force - Setdown" value={calculations.forceAnalysis.downwardForceSetdown} unit="lbs" className="text-red-600"/>
                                        <DataRow label="Up/Down Force - Cement" value={calculations.forceAnalysis.upwardForceCementBuoyancy} unit="lbs" className={calculations.forceAnalysis.upwardForceCementBuoyancy > 0 ? "text-red-600" : "text-green-600"}/>
                                        <hr className="my-2"/>
                                        <DataRow label="Net Downward Force" value={calculations.forceAnalysis.netDownwardForce} unit="lbs" />
                                        <DataRow label="Net Force with SF" value={calculations.forceAnalysis.netForceWithSF} unit="lbs" />
                                    </CalculationCard>
                                     <CalculationCard title="U-TUBE EFFECT CALCULATIONS">
                                        <DataRow label="Pressure Diff at Surface" value={calculations.uTubeEffect.pressureDiffAtSurface} unit="psi" />
                                        <DataRow label="Critical Pump Rate" value={calculations.uTubeEffect.criticalPumpRate} unit="bpm" />
                                    </CalculationCard>
                                </div>
                            )}

                            {resultsView === 'cement' && (
                                <div className="animate-fade-in">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-3">CEMENT FORCE & HYDROSTATIC TABLE</h3>
                                    <CementForceTable />
                                </div>
                            )}

                             {resultsView === 'ai' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                    <div className="space-y-4">
                                        <button onClick={handleGenerateProcedure} disabled={isGeneratingProcedure || isAssessingRisk} className="w-full flex items-center justify-center p-3 rounded-lg bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition-colors shadow-lg disabled:bg-purple-300"><Sparkles className="mr-2" size={20} />{isGeneratingProcedure ? <><LoaderCircle className="animate-spin mr-2"/> Generating...</> : 'Generate Cementing Procedure'}</button>
                                        <button onClick={handleRunRiskAssessment} disabled={isAssessingRisk || isGeneratingProcedure} className="w-full flex items-center justify-center p-3 rounded-lg bg-red-600 text-white font-bold text-lg hover:bg-red-700 transition-colors shadow-lg disabled:bg-red-300"><ShieldAlert className="mr-2" size={20} />{isAssessingRisk ? <><LoaderCircle className="animate-spin mr-2"/> Assessing...</> : 'Run Risk Assessment'}</button>
                                    </div>
                                    {(geminiProcedure || geminiRiskAssessment) ? (
                                        <div className={`p-6 rounded-xl shadow-md prose prose-sm max-w-none ${geminiProcedure ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
                                            <h3 className={`text-lg font-semibold mb-4 ${geminiProcedure ? 'text-purple-800' : 'text-red-800'}`}>{geminiProcedure ? 'AI-Generated Cementing Procedure' : 'AI-Generated Risk Assessment'}</h3>
                                            <div dangerouslySetInnerHTML={{ __html: geminiProcedure || geminiRiskAssessment || '' }} className="whitespace-pre-wrap font-sans"/>
                                        </div>
                                    ) : <div className="flex items-center justify-center bg-slate-50 rounded-xl p-6"><p className="text-slate-500">AI analysis output will appear here.</p></div>}
                                </div>
                            )}
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
                                                    <div dangerouslySetInnerHTML={{ __html: (value as string).replace(/\[i\]/g, `<sup class="text-cyan-600 font-bold">[i]</sup>`) }} />
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
                                <input type="number" value={packerForceSimInput} onChange={(e) => setPackerForceSimInput(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" />
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
