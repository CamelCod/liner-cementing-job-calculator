import React, { useState, useEffect, useCallback, FC } from 'react';
import { Download, Calculator, Upload, Drill, FlaskConical, ClipboardList, MapPin, MessageSquareMore, LoaderCircle, TrendingUp, LocateFixed, Bot, CheckCircle2, AlertTriangle, LayoutDashboard, Table, BrainCircuit } from 'lucide-react';
import type { 
    PipeConfig, Fluid, MudConfig, SurveyRow, Calculations, ActiveTab, Depth, HoleOverlapConfig, 
    ParsedPipeConfig, PlotConfig, DeproReport
} from './types';
import { SafeHtml } from './utils/htmlSanitizer';
import * as geminiService from './services/geminiService';
import { calculateTorqueDrag } from './services/torqueDragService';
import Modal from './components/Modal';
// Extracted components & calculation engine
import FluidControl from './components/FluidControl';
import FluidInputs from './components/FluidInputs';
import ResultTabButton from './components/ResultTabButton';
import { TermExplainerModal } from './components/TermExplainerModal';
import WellAnalysisReport from './components/WellAnalysisReport';
import { DetailedResults } from './components/DetailedResults';
import AIInsights from './components/AIInsights';
import CalculationErrorBoundary from './components/CalculationErrorBoundary';
// Imported formerly inline subcomponents (deduplicated)
import PipeInput from './components/PipeInput';
import CalculationCard from './components/CalculationCard';
import DataRow from './components/DataRow';
import { calculateEnhancedCementingJob } from './services/enhancedCalculationEngine';
import { adaptEnhancedResultsToLegacy } from './services/calculationAdapter';
import { runBackendCalculation } from './services/backendApi';
import { findTvdFromMd } from './utils/surveyCalculations';
import { loadCasingLinerTable, loadDrillPipeMeasures } from './services/dataLoader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DPMeasure } from './services/dataLoader';


// ============================================================================
// CONSTANT DATA TABLES
// ============================================================================
let drillPipeData: DPMeasure[] = [
    { od: '3.500', id: '2.992', wt: '9.50' },
    { od: '4.000', id: '3.476', wt: '11.85' },
    { od: '4.500', id: '3.826', wt: '16.60' },
    { od: '4.500', id: '3.670', wt: '20.00' },
    { od: '5.000', id: '4.276', wt: '19.50' },
    { od: '5.000', id: '4.156', wt: '25.60' },
    { od: '5.500', id: '4.800', wt: '19.50' },
    { od: '5.500', id: '4.670', wt: '24.70' },
    { od: '6.625', id: '5.965', wt: '25.20' },
    { od: '6.625', id: '5.875', wt: '28.20' },
];

let casingLinerData = [
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

let drillPipeGrades = ['E-75', 'X-95', 'G-105', 'S-135', 'V-150', 'L-80', 'P-110'];

// NOTE: Previously inline UI sub-components (PipeInput, CalculationCard, DataRow) have been removed
// here to eliminate duplication. They are now imported from ./components/*.


// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
const App: FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('well-config');
    const [resultsView, setResultsView] = useState<'dashboard' | 'details' | 'ai' | 'cement' | 'td'>('dashboard');
    const [dpConfig, setDpConfig] = useState<'single' | 'dual'>('dual');
    
    // ------------------------------------------------------------------------
    // CORE STATE
    // ------------------------------------------------------------------------
    const [wellName, setWellName] = useState('Well-123');
    const [jobDate, setJobDate] = useState(new Date().toISOString().split('T')[0]);
    const [setdownForce, setSetdownForce] = useState('20000');
    const [hookloadSF, setHookloadSF] = useState('1.25');
    const [forceSF, setForceSF] = useState('1.5');
    // New Plug/Dart parameters
    const [dartLaunchVolumeBbl, setDartLaunchVolumeBbl] = useState('0');
    const [shearStrengthPsi, setShearStrengthPsi] = useState('500');
    const [pumpStrokeToleranceBbl, setPumpStrokeToleranceBbl] = useState('0.5');


    const [casing, setCasing] = useState<PipeConfig>({ od: '9.625', id: '8.799', wt: '40.00', md: '5100', tvd: '5099', grade: 'P-110' });
    const [liner, setLiner] = useState<PipeConfig>({ od: '7.000', id: '6.184', wt: '29.00', md: '9280', tvd: '8463', grade: 'L-80' });
    const [dp1, setDp1] = useState<PipeConfig>({ grade: 'G-105', od: '5.500', id: '4.67', wt: '24.70', length: '5480', md: '5820', tvd: '5819' });
    const [dp2, setDp2] = useState<PipeConfig>({ grade: 'S-135', od: '5.000', id: '4.276', wt: '19.50', length: '3800', md: '0', tvd: '0' });
    const [clTable, setClTable] = useState(casingLinerData);
    const [dpMeasures, setDpMeasures] = useState<DPMeasure[]>(drillPipeData);
    const [dpGradesList, setDpGradesList] = useState(drillPipeGrades);
    
    const [holeOverlap, setHoleOverlap] = useState<HoleOverlapConfig>({ openHoleId: '8.5', linerOverlap: '300', shoeTrackLength: '221', cementThickeningTime: '200', rigCapacity: '500000', casingFrictionFactor: '0.25', openHoleFrictionFactor: '0.30' });
    const [landingCollar, setLandingCollar] = useState<Depth>({ md: '9057', tvd: '' });
    const [totalDepth, setTotalDepth] = useState<Depth>({ md: '9283', tvd: '' });

    const [mud, setMud] = useState<MudConfig>({ ppg: '13.00' });
    const [spacers, setSpacers] = useState<Fluid[]>([{ label: 'Spacer 1', volume: '40', ppg: '12.00' }, { label: 'Spacer 2', volume: '30', ppg: '8.40' }, { label: 'Spacer 3', volume: '40', ppg: '12.00' }]);
    const [cements, setCements] = useState<Fluid[]>([{ label: 'Lead Cement', volume: '50', ppg: '15.80' }, { label: 'Tail Cement', volume: '80', ppg: '16.70' }]);
    const [displacements, setDisplacements] = useState<Fluid[]>([{ label: 'Liner Displ. 1', volume: '22', ppg: '12.00' }, { label: 'Liner Displ. 2', volume: '100', ppg: '8.30' }, { label: 'DP Displ.', volume: '120', ppg: '11.00' }]);
    const [numSpacers, setNumSpacers] = useState(3);
    const [numCements, setNumCements] = useState(2);
    const [numDisplacements, setNumDisplacements] = useState(3);
    const [surveyData, setSurveyData] = useState<SurveyRow[]>([]);
    const [pastedSurveyText, setPastedSurveyText] = useState('');
    const [calculations, setCalculations] = useState<Calculations | null>(null);
    const [useBackend, setUseBackend] = useState<boolean>(false);
    const [isCalculating, setIsCalculating] = useState<boolean>(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    
    // ------------------------------------------------------------------------
    // AI / ASSIST STATES
    // ------------------------------------------------------------------------
    const [showTermExplainer, setShowTermExplainer] = useState(false);
    const [termToExplain, setTermToExplain] = useState('');
    const [explainedTerm, setExplainedTerm] = useState('');
    const [isExplaining, setIsExplaining] = useState(false);

    // ------------------------------------------------------------------------
    // ADVANCED ANALYSIS STATE
    // ------------------------------------------------------------------------
    const [packerForceSimInput, setPackerForceSimInput] = useState('20000');
    const [isSimulatingPacker, setIsSimulatingPacker] = useState(false);
    const [packerSimResult, setPackerSimResult] = useState<string | null>(null);
    const [torqueDragResultText, setTorqueDragResultText] = useState<string | null>(null);
    
    const [isAnalyzingDepro, setIsAnalyzingDepro] = useState(false);
    const [deproAnalysisResult, setDeproAnalysisResult] = useState<DeproReport | null>(null);


    // ------------------------------------------------------------------------
    // SURVEY / TVD UTILITIES
    // ------------------------------------------------------------------------
    const findTvdFromMdCallback = useCallback((mdStr: string | number | undefined): string => {
        return findTvdFromMd(mdStr, surveyData);
    }, [surveyData]);

    // ------------------------------------------------------------------------
    // INITIAL DATA LOAD (TABLES)
    // ------------------------------------------------------------------------
    useEffect(() => {
        // Load external tables and extend defaults
        (async () => {
            try {
                const [cl, dpMeas] = await Promise.all([
                    loadCasingLinerTable(casingLinerData),
                    loadDrillPipeMeasures(drillPipeData),
                ]);
                setClTable(cl);
                setDpMeasures(dpMeas);
                // Use fixed list of grade labels for the dropdown
                setDpGradesList(drillPipeGrades);
            } catch {
                // ignore and keep defaults
            }
        })();
    }, []);

    // ------------------------------------------------------------------------
    // DERIVED OPTIONS (VALIDATION / CONSTRAINTS)
    // ------------------------------------------------------------------------
    const linerOdOptions = React.useMemo(() => {
        const casingIdNum = parseFloat(casing.id || '0');
        return [...new Set(clTable.map(r => r.od))].filter(od => parseFloat(od) < casingIdNum);
    }, [clTable, casing.id]);

    // Constrain liner OD if no longer valid
    useEffect(() => {
        if (liner.od && !linerOdOptions.includes(liner.od)) {
            const newOd = linerOdOptions[0] || '';
            if (newOd) {
                const first = clTable.find(r => r.od === newOd);
                if (first) setLiner(l => ({ ...l, od: first.od, wt: first.wt, id: first.id }));
            }
        }
    }, [linerOdOptions]);

    // Drill Pipe OD options constrained by liner ID
    const dpOdOptions = React.useMemo(() => {
        const linerIdNum = parseFloat(liner.id || '0');
        const ods = [...new Set(dpMeasures.map(r => r.od))].filter(od => parseFloat(od) < linerIdNum);
        return ods;
    }, [dpMeasures, liner.id]);

    // Auto-correct drill pipe ODs if invalid
    useEffect(() => {
        if (dp1.od && !dpOdOptions.includes(dp1.od)) {
            const newOd = dpOdOptions[0] || '';
            if (newOd) {
                const first = dpMeasures.find(r => r.od === newOd);
                if (first) setDp1(d => ({ ...d, od: first.od, wt: first.wt, id: first.id }));
            }
        }
        if (dp2.od && !dpOdOptions.includes(dp2.od)) {
            const newOd = dpOdOptions[0] || '';
            if (newOd) {
                const first = dpMeasures.find(r => r.od === newOd);
                if (first) setDp2(d => ({ ...d, od: first.od, wt: first.wt, id: first.id }));
            }
        }
    }, [dpOdOptions]);

    // Filtered datasets for pipe selectors
    const casingDataForInput = React.useMemo(() => clTable, [clTable]);
    const linerDataForInput = React.useMemo(() => clTable.filter(r => linerOdOptions.includes(r.od)), [clTable, linerOdOptions]);
    const dpDataForInput = React.useMemo(() => dpMeasures.filter(r => dpOdOptions.includes(r.od)), [dpMeasures, dpOdOptions]);

    useEffect(() => {
        setSpacers(current => Array.from({ length: numSpacers }, (_, i) => current[i] || { label: `Spacer ${i + 1}`, volume: '100', ppg: '' }));
    }, [numSpacers]);
    useEffect(() => {
        setCements(current => Array.from({ length: numCements }, (_, i) => current[i] || { label: i === 0 ? 'Lead Cement' : `Tail Cement ${i}`, volume: '100', ppg: '' }));
    }, [numCements]);
    useEffect(() => {
        setDisplacements(current => Array.from({ length: numDisplacements }, (_, i) => current[i] || { label: `Displ. Fluid ${i + 1}`, volume: '100', ppg: '' }));
    }, [numDisplacements]);
    
    // Recalculate TVDs when MDs or survey change
    useEffect(() => {
        setCasing(c => ({ ...c, tvd: findTvdFromMdCallback(c.md) }));
        setLiner(l => ({ ...l, tvd: findTvdFromMdCallback(l.md) }));
        setDp1(dp => ({ ...dp, tvd: findTvdFromMdCallback(dp.md) }));
        setDp2(dp => ({ ...dp, tvd: findTvdFromMdCallback(dp.md) }));
        setLandingCollar(lc => ({ ...lc, tvd: findTvdFromMdCallback(lc.md) }));
        setTotalDepth(td => ({ ...td, tvd: findTvdFromMdCallback(td.md) }));
    }, [casing.md, liner.md, dp1.md, dp2.md, landingCollar.md, totalDepth.md, surveyData, findTvdFromMdCallback]);

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


    // ------------------------------------------------------------------------
    // CORE CALCULATION EXECUTION (memoized with complete dependency list)
    // NOTE: Added missing dependencies (dartLaunchVolumeBbl, shearStrengthPsi, pumpStrokeToleranceBbl)
    // to prevent stale closures causing incorrect calculations.
    // ------------------------------------------------------------------------
    const runDynamicCalculations = useCallback(async () => {
        setIsCalculating(true);
        try {
            if (useBackend) {
                const backendCalcs = await runBackendCalculation({
                    casing, liner, dp1, dp2, dpConfig,
                    mud, holeOverlap,
                    wellName,
                    jobDate: jobDate || '',
                    previousPlots: calculations?.plots || [],
                    previousTorqueDrag: calculations?.torqueDragResult || null,
                });
                setCalculations(backendCalcs);
            } else {
                const enhancedResults = calculateEnhancedCementingJob({
                    casing, liner, dp1, dp2, dpConfig,
                    mud, spacers, cements, displacements,
                    holeOverlap: {
                        ...holeOverlap,
                        shearStrengthPsi,
                        pumpStrokeToleranceBbl
                    },
                    landingCollarMd: parseFloat(landingCollar.md || '0'),
                    totalDepthMd: parseFloat(totalDepth.md || '0'),
                    setdownForceLbs: parseFloat(setdownForce) || 0,
                    hookloadSF: parseFloat(hookloadSF) || 1,
                    forceSF: parseFloat(forceSF) || 1,
                    findTvdFromMd: (md: number) => parseFloat(findTvdFromMdCallback(md)),
                    dartLaunchVolumeBbl: parseFloat(dartLaunchVolumeBbl) || 0
                });
                const newCalcs = adaptEnhancedResultsToLegacy(
                    enhancedResults,
                    wellName,
                    jobDate || '',
                    calculations?.plots || [],
                    calculations?.torqueDragResult || null
                );
                setCalculations(newCalcs);
            }
            setActiveTab('results');
            setResultsView('dashboard');
        } catch (error) {
            console.error('Calculation failed:', error);
            setModalMessage(`Calculation failed: ${error instanceof Error ? (error as Error).message : 'Unknown error'}`);
            setShowInfoModal(true);
        } finally {
            setIsCalculating(false);
        }
    }, [useBackend, casing, liner, dp1, dp2, dpConfig, mud, spacers, cements, displacements, holeOverlap, landingCollar.md, totalDepth.md, setdownForce, hookloadSF, forceSF, wellName, jobDate, findTvdFromMdCallback, calculations?.plots, calculations?.torqueDragResult, dartLaunchVolumeBbl, shearStrengthPsi, pumpStrokeToleranceBbl]);

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

        const resultRotate = calculateTorqueDrag({
            survey: surveyData.map(r => ({ md: parseFloat(r[0]), tvd: parseFloat(r[1]), incl: parseFloat(r[2]) })),
            string,
            mudWeight: parseFloat(mud.ppg),
            casingFriction: parseFloat(holeOverlap.casingFrictionFactor),
            openHoleFriction: parseFloat(holeOverlap.openHoleFrictionFactor),
            casingShoeMd: pCasing.md,
            rotate: true,
            targetSetdown: parseFloat(setdownForce) || 15000,
            segmentFt: 25,
        });
        const resultNoRotate = calculateTorqueDrag({
            survey: surveyData.map(r => ({ md: parseFloat(r[0]), tvd: parseFloat(r[1]), incl: parseFloat(r[2]) })),
            string,
            mudWeight: parseFloat(mud.ppg),
            casingFriction: parseFloat(holeOverlap.casingFrictionFactor),
            openHoleFriction: parseFloat(holeOverlap.openHoleFrictionFactor),
            casingShoeMd: pCasing.md,
            rotate: false,
            targetSetdown: parseFloat(setdownForce) || 15000,
            segmentFt: 25,
        });
    // Build / replace plot configs
        const tdHookloadPlot: PlotConfig = {
            id: 'td-hookload', type: 'line', title: 'T&D Hookload vs Depth', x_field: 'depth',
            y_fields: [
                { key: 'hookload_out', name: 'Hookload (tension)', color: '#0ea5e9' },
                { key: 'drag', name: 'Drag (Δ tension)', color: '#f97316' }
            ],
            series: resultRotate.plotData,
            options: { xlabel: 'MD (ft)', ylabel: 'Force (lbs)' }
        };
        const tdTorqueDragRotatePlot: PlotConfig = {
            id: 'td-rotate-torque-drag', type: 'line', title: 'Torque & Drag vs Depth (Rotate ON)', x_field: 'depth',
            y_fields: [
                { key: 'torque', name: 'Torque', color: '#10b981' },
                { key: 'drag', name: 'Drag', color: '#ef4444' }
            ],
            series: resultRotate.plotData,
            options: { xlabel: 'MD (ft)', ylabel: 'Force / Torque' }
        };
        const tdTorqueDragNoRotatePlot: PlotConfig = {
            id: 'td-norotate-torque-drag', type: 'line', title: 'Torque & Drag vs Depth (Rotate OFF)', x_field: 'depth',
            y_fields: [
                { key: 'torque', name: 'Torque', color: '#14b8a6' },
                { key: 'drag', name: 'Drag', color: '#f97316' }
            ],
            series: resultNoRotate.plotData,
            options: { xlabel: 'MD (ft)', ylabel: 'Force / Torque' }
        };
        const wellPathPlot: PlotConfig = {
            id: 'well-path', type: 'line', title: 'Well Path (Inclination)', x_field: 'md',
            y_fields: [ { key: 'inc', name: 'Inclination', color: '#6366f1' } ],
            series: surveyData.map(r => ({ md: parseFloat(r[0]), inc: parseFloat(r[2]) })).filter(p => Number.isFinite(p.md) && Number.isFinite(p.inc)),
            options: { xlabel: 'MD (ft)', ylabel: 'Inc (°)' }
        };

        setCalculations(prev => prev ? ({
            ...prev,
            torqueDragResult: resultRotate,
            torqueDragRotate: resultRotate,
            torqueDragNoRotate: resultNoRotate,
            plots: [
                // keep prior plots, but replace any existing T&D or well-path plots by id
                ...((prev.plots || []).filter(p => !['td-hookload', 'td-rotate-torque-drag', 'td-norotate-torque-drag', 'well-path'].includes(p.id))),
                tdHookloadPlot,
                tdTorqueDragRotatePlot,
                tdTorqueDragNoRotatePlot,
                wellPathPlot
            ]
        }) : null);
        setTorqueDragResultText(resultRotate.summary + '\n---\n' + resultNoRotate.summary);
    setActiveTab('results');
    setResultsView('td');
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


    // ------------------------------------------------------------------------
    // RENDER HELPERS (TABS)
    // ------------------------------------------------------------------------
    const renderWellConfigTab = () => (
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
                    <label className="block" htmlFor="well-name"><span className="text-sm font-medium text-slate-600">Well Name</span><input id="well-name" type="text" value={wellName} onChange={(e) => setWellName(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    <label className="block" htmlFor="job-date"><span className="text-sm font-medium text-slate-600">Date</span><input id="job-date" type="date" value={jobDate} onChange={(e) => setJobDate(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    <label className="block" htmlFor="setdown-force"><span className="text-sm font-medium text-slate-600">Setdown Force (lbs)</span><input id="setdown-force" type="number" value={setdownForce} onChange={(e) => setSetdownForce(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    <label className="block" htmlFor="hookload-sf"><span className="text-sm font-medium text-slate-600">Hookload SF</span><input id="hookload-sf" type="number" step="0.05" value={hookloadSF} onChange={(e) => setHookloadSF(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    <label className="block" htmlFor="force-sf"><span className="text-sm font-medium text-slate-600">Force SF</span><input id="force-sf" type="number" step="0.05" value={forceSF} onChange={(e) => setForceSF(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    <label className="block" htmlFor="dart-launch-vol"><span className="text-sm font-medium text-slate-600">Dart Launch Vol (bbl)</span><input id="dart-launch-vol" type="number" step="0.1" value={dartLaunchVolumeBbl} onChange={(e) => setDartLaunchVolumeBbl(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                </div>
            </div>
            <PipeInput label="Parent Casing" pipe={casing} setPipe={setCasing} pipeData={casingDataForInput} />
            <PipeInput label="Liner" pipe={liner} setPipe={setLiner} pipeData={linerDataForInput} />
            <PipeInput 
                label="DP1 (Upper)" 
                pipe={dp1} 
                setPipe={setDp1} 
                pipeData={dpDataForInput} 
                gradeOptions={dpGradesList} 
                gradeLabel="DP1 Grade" 
                deriveDepths={(p) => {
                    // If MD empty, compute as length (assumes starts at surface) else keep provided
                    const mdNum = p.md ? parseFloat(p.md) : parseFloat(p.length || '0');
                    const tvd = findTvdFromMdCallback(mdNum);
                    return { md: String(mdNum || 0), tvd };
                }}
            />
            <PipeInput 
                label="DP2 (Lower)" 
                pipe={dp2} 
                setPipe={setDp2} 
                pipeData={dpDataForInput} 
                gradeOptions={dpGradesList} 
                gradeLabel="DP2 Grade" 
                disabled={dpConfig === 'single'} 
                deriveDepths={(p) => {
                    // DP2 bottom MD sits below DP1 by its own length if md not explicitly set
                    const dp1Length = parseFloat(dp1.length || '0');
                    const baseStart = dp1Length; // assume tapered string continues
                    const mdNum = p.md ? parseFloat(p.md) : baseStart + parseFloat(p.length || '0');
                    const tvd = findTvdFromMdCallback(mdNum);
                    return { md: String(mdNum || 0), tvd };
                }}
            />
            <div className="bg-slate-50 p-6 rounded-xl shadow-inner space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">Depths & Dimensions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <label className="block" htmlFor="open-hole-id"><span className="text-sm font-medium text-slate-600">Open Hole ID (in)</span><input id="open-hole-id" type="number" value={holeOverlap.openHoleId} onChange={(e) => setHoleOverlap({ ...holeOverlap, openHoleId: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    <label className="block" htmlFor="liner-overlap"><span className="text-sm font-medium text-slate-600">Liner Overlap (ft)</span><input id="liner-overlap" type="number" value={holeOverlap.linerOverlap} onChange={(e) => setHoleOverlap({ ...holeOverlap, linerOverlap: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    <label className="block" htmlFor="landing-collar-md"><span className="text-sm font-medium text-slate-600">Landing Collar MD (ft)</span><input id="landing-collar-md" type="number" value={landingCollar.md} onChange={(e) => setLandingCollar({...landingCollar, md: e.target.value})} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    <label className="block"><span className="text-sm font-medium text-slate-600">Landing Collar TVD (ft)</span><span className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-200 text-slate-600 cursor-not-allowed text-center">{landingCollar.tvd}</span></label>
                    <label className="block" htmlFor="total-depth-md"><span className="text-sm font-medium text-slate-600">Total Depth MD (ft)</span><input id="total-depth-md" type="number" value={totalDepth.md} onChange={(e) => setTotalDepth({...totalDepth, md: e.target.value})} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    <label className="block"><span className="text-sm font-medium text-slate-600">Total Depth TVD (ft)</span><span className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-200 text-slate-600 cursor-not-allowed text-center">{totalDepth.tvd}</span></label>
                    <label className="block" htmlFor="shoe-track-length"><span className="text-sm font-medium text-slate-600">Shoe Track Length (ft)</span><input id="shoe-track-length" type="number" value={holeOverlap.shoeTrackLength} onChange={(e) => setHoleOverlap({ ...holeOverlap, shoeTrackLength: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    <label className="block" htmlFor="cement-thickening-time"><span className="text-sm font-medium text-slate-600">Cement Thickening Time (min)</span><input id="cement-thickening-time" type="number" value={holeOverlap.cementThickeningTime} onChange={(e) => setHoleOverlap({ ...holeOverlap, cementThickeningTime: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    <label className="block" htmlFor="shear-strength"><span className="text-sm font-medium text-slate-600">Shear Strength (psi)</span><input id="shear-strength" type="number" value={shearStrengthPsi} onChange={(e) => setShearStrengthPsi(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                    <label className="block" htmlFor="pump-stroke-tol"><span className="text-sm font-medium text-slate-600">Pump Stroke Tol (bbl)</span><input id="pump-stroke-tol" type="number" step="0.1" value={pumpStrokeToleranceBbl} onChange={(e) => setPumpStrokeToleranceBbl(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" /></label>
                </div>
            </div>
        </div>
    );

    const renderFluidsTab = () => {
        return (
            <div className="p-6 space-y-6 animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-800">Define Fluids</h2>
                <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-xl shadow-inner">
                        <h3 className="text-lg font-semibold text-slate-700 mb-4">Base Mud</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                            <div>
                                <span className="text-sm font-medium text-slate-600">Fluid</span>
                                <span className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-200 text-slate-700 text-center">Base Mud</span>
                            </div>
                            <label className="block" htmlFor="mud-weight-ppg">
                                <span className="text-sm font-medium text-slate-600">Weight (ppg)</span>
                                <input 
                                    id="mud-weight-ppg"
                                    type="number" 
                                    value={mud.ppg} 
                                    onChange={(e) => setMud({ ppg: e.target.value })} 
                                    className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900"
                                    aria-describedby="mud-weight-help"
                                    min="8"
                                    max="20"
                                    step="0.1"
                                    placeholder="Enter mud weight in PPG"
                                />
                                <div id="mud-weight-help" className="text-xs text-slate-500 mt-1">
                                    Drilling fluid density in pounds per gallon (typical: 9-15 PPG)
                                </div>
                            </label>
                        </div>
                    </div>
                    <FluidInputs fluids={spacers} setFluids={setSpacers} label="Spacers" />
                    <FluidInputs fluids={cements} setFluids={setCements} label="Cements" />
                    <FluidInputs fluids={displacements} setFluids={setDisplacements} label="Displacement Fluids" />
                </div>
            </div>
        );
    };

    const renderSurveyTab = () => {
        return (
            <div className="p-6 space-y-6 max-w-2xl mx-auto animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-800">Paste Survey Data</h2>
                <div className="bg-slate-50 p-6 rounded-xl shadow-inner space-y-4">
                    <label className="block">
                        <span className="text-sm font-medium text-slate-600">Paste data here (MD, TVD, Inc. Angle)</span>
                        <textarea 
                            className="mt-1 block w-full h-40 p-2 border border-slate-300 rounded-md font-mono text-sm bg-white text-slate-900" 
                            value={pastedSurveyText} 
                            onChange={(e) => setPastedSurveyText(e.target.value)} 
                            placeholder={"e.g.,\n100 100 0.5\n200 199.8 1.2\n300 299.1 2.5"}
                        />
                    </label>
                    <button 
                        onClick={handleProcessSurveyData} 
                        className="w-full flex items-center justify-center p-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-md"
                    >
                        <Upload className="mr-2" size={20} /> Process Data
                    </button>
                </div>
                {surveyData.length > 0 && (
                    <div className="bg-slate-50 p-6 rounded-xl shadow-inner">
                        <h3 className="text-lg font-semibold text-slate-700 mb-4">Processed Survey ({surveyData.length} points)</h3>
                        <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-200 sticky top-0">
                                    <tr>
                                        <th className="text-left p-2 font-medium text-slate-700">MD (ft)</th>
                                        <th className="text-left p-2 font-medium text-slate-700">TVD (ft)</th>
                                        <th className="text-left p-2 font-medium text-slate-700">Inc. (°)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-600">
                                    {surveyData.map((point, i) => (
                                        <tr key={`${point[0]}-${point[1]}-${point[2]}-${i}`} className="border-t border-slate-200">
                                            <td className="p-2">{parseFloat(point[0]).toFixed(1)}</td>
                                            <td className="p-2">{parseFloat(point[1]).toFixed(1)}</td>
                                            <td className="p-2">{parseFloat(point[2]).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderAdvancedTab = () => {
        return (
            <div className="p-6 space-y-8 max-w-4xl mx-auto animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-800">Advanced Analysis</h2>
                
                {/* DEPRO Analysis */}
                <div className="bg-slate-50 p-6 rounded-xl shadow-inner">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                        <Bot className="mr-2 text-cyan-500"/>DEPRO Expert Analysis
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Leverage AI to analyze the calculated results in the context of the DEPRO software suite. 
                        This provides a comprehensive report covering hydraulics, torque & drag, and operational risks.
                    </p>
                    <button 
                        onClick={handleDeproAnalysis} 
                        disabled={!calculations || isAnalyzingDepro} 
                        className="w-full flex items-center justify-center p-3 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors shadow-md disabled:bg-cyan-300 disabled:cursor-not-allowed"
                    >
                        {isAnalyzingDepro ? (
                            <>
                                <LoaderCircle className="animate-spin mr-2"/>
                                Generating Report...
                            </>
                        ) : (
                            'Generate DEPRO Analysis'
                        )}
                    </button>
                    {deproAnalysisResult && (
                        <div className="mt-6 p-6 bg-white rounded-lg shadow-md">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 text-center">
                                {deproAnalysisResult.title}
                            </h3>
                            <div className="prose prose-sm max-w-none space-y-4">
                                {Object.entries(deproAnalysisResult).map(([key, value]) => {
                                    if (key === 'title' || !value) return null;
                                    const heading = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                    return (
                                        <div key={key}>
                                            <h4 className="font-semibold text-slate-700">{heading}</h4>
                                            <SafeHtml 
                                                html={(value as string).replace(/\[i\]/g, `<sup class="text-cyan-600 font-bold">[i]</sup>`)} 
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Torque & Drag Analysis */}
                <div className="bg-slate-50 p-6 rounded-xl shadow-inner">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                        <TrendingUp className="mr-2 text-indigo-500"/>Torque & Drag Analysis
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Run a deterministic soft-string model to analyze torque, drag, and hookload. Requires survey data.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <label className="block" htmlFor="casing-friction-factor">
                            <span className="text-sm font-medium text-slate-600">Casing Friction Factor</span>
                            <input 
                                id="casing-friction-factor"
                                type="number" 
                                step="0.01" 
                                value={holeOverlap.casingFrictionFactor} 
                                onChange={(e) => setHoleOverlap({ ...holeOverlap, casingFrictionFactor: e.target.value })} 
                                className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900"
                                aria-describedby="casing-friction-help"
                                min="0.1"
                                max="0.5"
                            />
                            <div id="casing-friction-help" className="text-xs text-slate-500 mt-1">
                                Typical range: 0.15-0.30 for cased hole sections
                            </div>
                        </label>
                        <label className="block" htmlFor="open-hole-friction-factor">
                            <span className="text-sm font-medium text-slate-600">Open Hole Friction Factor</span>
                            <input 
                                id="open-hole-friction-factor"
                                type="number" 
                                step="0.01" 
                                value={holeOverlap.openHoleFrictionFactor} 
                                onChange={(e) => setHoleOverlap({ ...holeOverlap, openHoleFrictionFactor: e.target.value })} 
                                className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900"
                                aria-describedby="open-hole-friction-help"
                                min="0.15"
                                max="0.6"
                            />
                            <div id="open-hole-friction-help" className="text-xs text-slate-500 mt-1">
                                Typical range: 0.25-0.40 for open hole sections
                            </div>
                        </label>
                    </div>
                    <button 
                        onClick={handleTorqueDragAnalysis} 
                        disabled={surveyData.length < 2} 
                        className="w-full flex items-center justify-center p-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-md disabled:bg-indigo-300 disabled:cursor-not-allowed"
                    >
                        Run T&D Analysis & Generate Plots
                    </button>
                    {torqueDragResultText && (
                        <div className="mt-4 p-4 bg-white rounded-md prose prose-sm max-w-none">
                            <SafeHtml 
                                html={torqueDragResultText.replace(/\n/g, '<br />')}
                            />
                        </div>
                    )}
                </div>

                {/* Packer Setting Force */}
                <div className="bg-slate-50 p-6 rounded-xl shadow-inner">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                        <LocateFixed className="mr-2 text-teal-500"/>Packer Setting Force Simulation
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Simulate the required surface slack-off weight to achieve a desired downhole force on the packer.
                    </p>
                    <label className="block mb-4">
                        <span className="text-sm font-medium text-slate-600">Required Packer Setting Force (lbs)</span>
                        <input 
                            type="number" 
                            value={packerForceSimInput} 
                            onChange={(e) => setPackerForceSimInput(e.target.value)} 
                            className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900" 
                        />
                    </label>
                    <button 
                        onClick={handlePackerForceSim} 
                        disabled={isSimulatingPacker} 
                        className="w-full flex items-center justify-center p-3 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors shadow-md disabled:bg-teal-300"
                    >
                        {isSimulatingPacker ? (
                            <>
                                <LoaderCircle className="animate-spin mr-2"/>
                                Simulating...
                            </>
                        ) : (
                            'Simulate Packer Force'
                        )}
                    </button>
                    {packerSimResult && (
                        <div className="mt-4 p-4 bg-white rounded-md prose prose-sm max-w-none">
                            <SafeHtml 
                                html={packerSimResult}
                                isMarkdown={true}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderResultsTab = () => {
        if (!calculations) {
            return (
                <div className="p-6 animate-fade-in">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Results</h2>
                    <div className="text-center py-10 bg-slate-50 rounded-lg">
                        <p className="text-slate-500">Press "Run Calculation" to see results here.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-6 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Results</h2>
                    <div className="flex items-center space-x-2 p-1 rounded-full bg-slate-100 border">
                        <ResultTabButton 
                            label="Dashboard" 
                            value="dashboard" 
                            icon={<LayoutDashboard size={16}/>} 
                            isActive={resultsView === 'dashboard'}
                            onClick={setResultsView}
                        />
                        <ResultTabButton 
                            label="Details" 
                            value="details" 
                            icon={<Table size={16}/>} 
                            isActive={resultsView === 'details'}
                            onClick={setResultsView}
                        />
                        <ResultTabButton 
                            label="Cement Table" 
                            value="cement" 
                            icon={<Table size={16}/>} 
                            isActive={resultsView === 'cement'}
                            onClick={setResultsView}
                        />
                        <ResultTabButton 
                            label="T&D" 
                            value="td" 
                            icon={<TrendingUp size={16}/>} 
                            isActive={resultsView === 'td'}
                            onClick={setResultsView}
                        />
                        <ResultTabButton 
                            label="AI" 
                            value="ai" 
                            icon={<BrainCircuit size={16}/>} 
                            isActive={resultsView === 'ai'}
                            onClick={setResultsView}
                        />
                    </div>
                </div>

                {/* Results Content */}
                <div>
                    {resultsView === 'dashboard' && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
                                                        <div className="xl:col-span-2">
                                                                <WellAnalysisReport
                                                                    casing={casing}
                                                                    liner={liner}
                                                                    dp1={dp1}
                                                                    spacers={spacers}
                                                                    cements={cements}
                                                                    displacements={displacements}
                                                                    holeOverlap={holeOverlap}
                                                                    landingCollar={landingCollar}
                                                                    totalDepth={totalDepth}
                                                                      calculations={null}
                                                                />
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
                                <CalculationCard title="CEMENT OPERATIONAL PARAMETERS">
                                    <DataRow label="Cement Volume" value={calculations.volumes.cementVolume} unit="bbls" />
                                    <DataRow label="Displacement Volume" value={calculations.volumes.displacementVolume} unit="bbls" />
                                    <DataRow label="Plug Drop" value={calculations.volumes.plugDrop} unit="bbls" />
                                    <DataRow label="Wait on Cement" value={calculations.operations.waitOnCement} unit="min" />
                                    <DataRow label="Cement Travel Time" value={calculations.operations.cementTravelTime} unit="min" />
                                </CalculationCard>
                                <CalculationCard title="VOLUMES & CIRCULATION">
                                    <DataRow label="Total Well Volume" value={calculations.volumes.totalWellVolume} unit="bbls" />
                                    <DataRow label="Liner Displacement Volume" value={calculations.volumes.linerDisplacementVolume} unit="bbls" />
                                    <DataRow label="Surface to Shoe" value={calculations.volumes.surfaceToShoe} unit="bbls" />
                                    <DataRow label="Circulation Rate" value={calculations.operations.circulationRate} unit="bpm" />
                                </CalculationCard>
                            </div>
                        </div>
                    )}

                    {resultsView === 'details' && <DetailedResults calculations={calculations} />}
                    {resultsView === 'cement' && (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold mb-4">Cement Table</h3>
                            <p className="text-gray-600">Cement table component will be implemented later...</p>
                        </div>
                    )}
                    {resultsView === 'td' && (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold mb-4">Torque & Drag Table</h3>
                            <p className="text-gray-600">Torque & Drag table component will be implemented later...</p>
                        </div>
                    )}
                    {resultsView === 'ai' && <AIInsights calculations={calculations} />}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'well-config':
                return renderWellConfigTab();
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
                return renderFluidsTab();
            case 'survey':
                return renderSurveyTab();
            case 'results':
                return renderResultsTab();
            case 'advanced':
                return renderAdvancedTab();
            default:
                return renderWellConfigTab();
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800 antialiased flex flex-col md:flex-row">
            {showInfoModal && <Modal title="Information" onClose={() => setShowInfoModal(false)}><p>{modalMessage}</p><button onClick={() => setShowInfoModal(false)} className="mt-6 w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors">OK</button></Modal>}
            <TermExplainerModal
                isVisible={showTermExplainer}
                termToExplain={termToExplain}
                explainedTerm={explainedTerm}
                isExplaining={isExplaining}
                onClose={() => { setShowTermExplainer(false); setExplainedTerm(''); setTermToExplain(''); }}
                onTermChange={setTermToExplain}
                onExplain={handleExplainTerm}
            />
            {/* SIDEBAR */}
            <div className="w-full md:w-72 bg-white shadow-xl p-4 flex flex-col justify-between">
                <div>
                    <h1 className="text-2xl font-bold mb-6 text-blue-700 flex items-center"><MapPin className="mr-2"/>Drilling App</h1>
                    <nav className="space-y-2">
                        <button onClick={() => setActiveTab('well-config')} className={`flex items-center w-full p-3 rounded-lg transition-colors text-left ${activeTab === 'well-config' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-slate-100'}`}><Drill className="mr-3" size={20} />Well Config</button>
                        <button onClick={() => setActiveTab('fluid-config')} className={`flex items-center w-full p-3 rounded-lg transition-colors text-left ${activeTab === 'fluid-config' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-slate-100'}`}><FlaskConical className="mr-3" size={20} />Fluid Config</button>
                        <button onClick={() => setActiveTab('fluids')} className={`flex items-center w-full p-3 rounded-lg transition-colors text-left ${activeTab === 'fluids' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-slate-100'}`}><FlaskConical className="mr-3" size={20} />Fluid Inputs</button>
                        <button onClick={() => setActiveTab('survey')} className={`flex items-center w-full p-3 rounded-lg transition-colors text-left ${activeTab === 'survey' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-slate-100'}`}><ClipboardList className="mr-3" size={20} />Paste Survey</button>
                        <button onClick={() => setActiveTab('advanced')} className={`flex items-center w-full p-3 rounded-lg transition-colors text-left ${activeTab === 'advanced' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-slate-100'}`}><TrendingUp className="mr-3" size={20} />Advanced Analysis</button>
                        <button onClick={() => setActiveTab('results')} className={`flex items-center w-full p-3 rounded-lg transition-colors text-left ${activeTab === 'results' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-slate-100'} ${!calculations ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!calculations}><LayoutDashboard className="mr-3" size={20} />Results</button>
                        <div className="mt-6 space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                                <span>Use Python Backend</span>
                                <input type="checkbox" aria-label="Toggle Python backend calculations" checked={useBackend} onChange={(e) => setUseBackend(e.target.checked)} />
                            </div>
                            <button onClick={runDynamicCalculations} disabled={isCalculating} className={`w-full flex items-center justify-center p-3 rounded-lg ${isCalculating ? 'bg-green-300 cursor-wait' : 'bg-green-500 hover:bg-green-600'} text-white font-bold text-lg transition-colors shadow-lg`}>
                                {isCalculating ? (<><LoaderCircle className="mr-2 animate-spin" size={20}/>Calculating...</>) : (<><Calculator className="mr-2" size={20} /> Run Calculation</>)}
                            </button>
                        </div>
                    </nav>
                </div>
                <div className="space-y-4 mt-6">
                    <button onClick={() => setShowTermExplainer(true)} className="w-full flex items-center justify-center p-3 rounded-lg bg-slate-500 text-white font-bold text-lg hover:bg-slate-600 transition-colors shadow-lg"><MessageSquareMore className="mr-2" size={20} /> Explain Term</button>
                    <button onClick={() => {
                        if (!calculations) return;
                        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
                        const margin = 36;
                        let y = margin;
                        doc.setFontSize(16);
                        doc.text('Liner Cementing Job Report', margin, y); y += 18;
                        doc.setFontSize(10);
                        doc.text(`Well: ${calculations.jobSummary.wellName}    Date: ${calculations.jobSummary.date}`, margin, y); y += 16;
                        autoTable(doc, { startY: y, head: [["Metric","Value"]], theme: 'striped', styles: { fontSize: 9 }, body: [
                            ["Initial Hookload (lbs)", `${Math.round(calculations.keyResults.initialHookload).toLocaleString()}`],
                            ["Post-Cement Hookload (lbs)", `${Math.round(calculations.keyResults.postCementHookload).toLocaleString()}`],
                            ["Drill String Stretch (in)", `${calculations.keyResults.drillStringStretch.toFixed(2)}`],
                            ["Net Force on Liner Hanger (lbs)", `${Math.round(calculations.keyResults.netForceOnLinerHanger).toLocaleString()}`],
                            ["U-Tube Pressure Diff (psi)", `${Math.round(calculations.keyResults.uTubePressureDifferential).toLocaleString()}`],
                        ]});
                        // advance y if adding more tables below
                        if (calculations.cementForces?.table?.length) {
                            autoTable(doc, { startY: y, head: [["Fluid","Annulus PPG","Inside PPG","ΔTVD (ft)","Direction","Force (lbs)"]], styles: { fontSize: 8 }, headStyles: { fillColor: [30,58,138] }, body: calculations.cementForces.table.map(r => [r.fluid, r.annulusPpg.toFixed(2), r.insidePpg.toFixed(2), r.deltaTvd.toFixed(0), r.direction, Math.round(r.force).toLocaleString()]) });
                        }
                        doc.save(`${calculations.jobSummary.wellName || 'job'}-report.pdf`);
                    }} className="w-full flex items-center justify-center p-3 rounded-lg bg-blue-500 text-white font-bold text-lg hover:bg-blue-600 transition-colors shadow-lg"><Download className="mr-2" size={20} /> Export Report</button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-6 md:p-10 bg-slate-100 overflow-y-auto">
                <CalculationErrorBoundary calculationType="Main App" onRetry={runDynamicCalculations}>
                    <div className="bg-white rounded-2xl shadow-xl min-h-full">
                        {renderContent()}
                    </div>
                </CalculationErrorBoundary>
            </main>

            {/* Visualization overlay removed earlier; unified into standard results */}
        </div>
    );
};

export default App;
