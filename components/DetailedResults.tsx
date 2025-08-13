import React, { memo, useCallback } from 'react';
import type { Calculations } from '../types';
import { X, Info } from 'lucide-react';

// =============== Modal Component ===============
export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = memo(({ title, onClose, children }) => {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  return (
    <dialog
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full m-4 relative transform transition-all ease-out duration-300 scale-95 opacity-0 animate-in-modal">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center" id="modal-title">
            <Info className="mr-2 text-blue-500" size={22}/>
            {title}
          </h3>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-in-modal {
          animation: scaleIn 0.2s forwards;
        }
      `}</style>
    </dialog>
  );
});
Modal.displayName = 'Modal';

// (Removed duplicate ResultTabButton component; unified dedicated component lives in components/ResultTabButton.tsx)

// =============== TermExplainerModal Component ===============
export const TermExplainerModal: React.FC<{
  readonly isVisible: boolean;
  readonly termToExplain: string;
  readonly explainedTerm: string;
  readonly isExplaining: boolean;
  readonly onClose: () => void;
  readonly onTermChange: (term: string) => void;
  readonly onExplain: () => void;
}> = ({
  isVisible,
  termToExplain,
  explainedTerm,
  isExplaining,
  onClose,
  onTermChange,
  onExplain
}) => {
  if (!isVisible) return null;
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onExplain();
    }
  };
  return (
    <Modal title="Explain a Drilling Term" onClose={onClose}>
      <label className="block mb-2">
        <span className="text-gray-600">Enter a term:</span>
        <input
          type="text"
          value={termToExplain}
          onChange={(e) => onTermChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900"
          placeholder="e.g., 'Rat Hole'"
        />
      </label>
      <button
        onClick={onExplain}
        className="w-full mt-2 flex items-center justify-center p-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
        disabled={isExplaining || !termToExplain}
      >
        {isExplaining ? 'Explaining...' : 'Explain Term'}
      </button>
      {explainedTerm && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800">{termToExplain}</h4>
          <div className="text-green-700 text-sm mt-1" dangerouslySetInnerHTML={{ __html: explainedTerm }} />
        </div>
      )}
    </Modal>
  );
};

// =============== CalculationStep Component ===============
const CalculationStep: React.FC<{
  title: string;
  stepNumber: number;
  children: React.ReactNode;
  highlight?: boolean;
}> = ({ title, stepNumber, children, highlight = false }) => (
  <div className={`bg-white p-6 rounded-xl shadow-md border-l-4 ${highlight ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
    <h3 className={`text-lg font-semibold mb-4 ${highlight ? 'text-blue-700' : 'text-slate-700'}`}>
      STEP {stepNumber}: {title}
    </h3>
    <div className="space-y-3">{children}</div>
  </div>
);

// =============== DataRow Component ===============
const DataRow: React.FC<{
  label: string;
  value: number | string;
  unit?: string;
  formula?: string;
  emphasis?: boolean;
  formatNumber?: (value: number, decimals?: number) => string;
}> = ({ label, value, unit, formula, emphasis = false, formatNumber }) => (
  <div className={`flex flex-col space-y-1 ${emphasis ? 'bg-yellow-50 p-2 rounded' : ''}`}>
    <div className="flex justify-between">
      <span className={`text-slate-600 ${emphasis ? 'font-medium' : ''}`}>{label}:</span>
      <span className={`font-medium ${emphasis ? 'text-yellow-800 font-bold' : ''}`}>
        {typeof value === 'number' && formatNumber ? formatNumber(value) : value} {unit && <span className="text-slate-500">{unit}</span>}
      </span>
    </div>
    {formula && (
      <div className="text-xs text-slate-500 font-mono bg-gray-100 p-1 rounded">
        {formula}
      </div>
    )}
  </div>
);

// =============== DetailedResults Component ===============
export const DetailedResults: React.FC<{ calculations: Calculations }> = ({ calculations }) => {
  const { keyCalculations } = calculations;
  const formatNumber = (value: number, decimals = 2) =>
    value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Detailed Step-by-Step Calculations</h2>
        <p className="text-blue-100">Complete calculation breakdown with all formulas and intermediate results</p>
      </div>
      
      {/* Example usage of your components */}
      <CalculationStep title="Input Parameters" stepNumber={1}>
        <DataRow 
          label="Hole Diameter" 
          value={keyCalculations.holeDiameter} 
          unit="inches"
          formatNumber={formatNumber}
        />
        <DataRow 
          label="Casing Outer Diameter" 
          value={keyCalculations.casingOD} 
          unit="inches"
          formatNumber={formatNumber}
        />
        <DataRow 
          label="Well Depth" 
          value={keyCalculations.wellDepth} 
          unit="ft"
          formatNumber={formatNumber}
        />
      </CalculationStep>

      <CalculationStep title="Volume Calculations" stepNumber={2} highlight>
        <DataRow 
          label="Annular Volume" 
          value={keyCalculations.annularVolume} 
          unit="bbl" 
          formula="π/4 × (D₁² - D₂²) × L ÷ 1029.4"
          emphasis
          formatNumber={formatNumber}
        />
        <DataRow 
          label="Displacement Volume" 
          value={keyCalculations.displacementVolume} 
          unit="bbl"
          formatNumber={formatNumber}
        />
      </CalculationStep>

      {/* Add more calculation steps as needed */}
    </div>
  );
};
