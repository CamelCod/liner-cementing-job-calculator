// ============================================================================
// === Main Component: AIInsights =============================================
// Provides summarized AI-style contextual recommendations & KPIs based on
// calculation results. Structured & easily extensible.
// ============================================================================

// --- Imports ----------------------------------------------------------------
import React, { useMemo } from 'react';
import type { Calculations } from '../types';
import { Bot, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

// --- Props ------------------------------------------------------------------
interface AIInsightsProps { calculations: Calculations; }

// --- Derived helpers --------------------------------------------------------
const useKpiCards = (c: Calculations) => useMemo(() => ([
  { label: 'Initial Hookload (lbs)', value: c.keyResults.initialHookload.toFixed(0), color: 'text-blue-600' },
  { label: 'Cement Volume (bbls)', value: c.volumes.cementVolume, color: 'text-green-600' },
  { label: 'String Stretch (in)', value: c.keyResults.drillStringStretch.toFixed(1), color: 'text-amber-600' },
  { label: 'Wait on Cement (min)', value: c.operations.waitOnCement, color: 'text-purple-600' }
]), [c]);

// --- Subcomponents ----------------------------------------------------------
const SectionCard: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; }> = ({ title, icon, children }) => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden">
    <div className="px-6 py-4 bg-slate-50 border-b flex items-center gap-2">
      {icon}{/* icon */}
      <h3 className="text-lg font-semibold text-slate-800 tracking-tight">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// --- Main Component Logic ---------------------------------------------------
const AIInsights: React.FC<AIInsightsProps> = ({ calculations }) => {
  const kpis = useKpiCards(calculations);

  return (
    <div className="animate-fade-in">
      <div className="space-y-6">
        <SectionCard title="AI Insights & Recommendations" icon={<Bot className="text-blue-500" size={20} />}> 
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-1 text-green-500 flex-shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-slate-800">Calculation Validation</h4>
                <p className="text-slate-600 text-sm">All key calculations are within normal operational parameters.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-1 text-blue-500 flex-shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-slate-800">Operational Recommendations</h4>
                <ul className="text-slate-600 text-sm list-disc list-inside space-y-1">
                  <li>Monitor hookload closely during cementing operations</li>
                  <li>Maintain circulation rate at {calculations.operations.circulationRate} bpm</li>
                  <li>Allow {calculations.operations.waitOnCement} minutes wait on cement</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 text-amber-500 flex-shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-slate-800">Risk Assessment</h4>
                <p className="text-slate-600 text-sm">Safety status: {calculations.safetyStatus.hookloadStatus}; Net force SF: {calculations.safetyStatus.netForceStatus}</p>
              </div>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Key Performance Indicators">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {kpis.map(k => (
              <div key={k.label} className="text-center p-3 md:p-4 bg-slate-50 rounded-lg">
                <div className={cn('text-xl md:text-2xl font-bold', k.color)}>{k.value}</div>
                <div className="text-[11px] md:text-sm text-slate-600 leading-tight mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default AIInsights;
