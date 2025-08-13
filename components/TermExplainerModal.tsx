import React from 'react';
import Modal from './Modal';

interface TermExplainerModalProps {
  readonly isVisible: boolean;
  readonly termToExplain: string;
  readonly explainedTerm: string;
  readonly isExplaining: boolean;
  readonly onClose: () => void;
  readonly onTermChange: (term: string) => void;
  readonly onExplain: () => void;
}

export const TermExplainerModal: React.FC<TermExplainerModalProps> = ({
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
