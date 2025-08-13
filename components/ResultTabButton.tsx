import React, { FC } from 'react';

// Type for the results view values
export type ResultsView = 'dashboard' | 'details' | 'ai' | 'cement' | 'td';

interface ResultTabButtonProps {
  readonly label: string;
  readonly value: ResultsView;
  readonly icon: React.ReactNode;
  readonly isActive: boolean;
  readonly onClick: (value: ResultsView) => void;
}

const ResultTabButton: FC<ResultTabButtonProps> = ({
  label,
  value,
  icon,
  isActive,
  onClick
}) => (
  <button
    onClick={() => onClick(value)}
    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
      isActive
        ? 'bg-white text-blue-600 shadow-sm border'
        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
    }`}
  >
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default ResultTabButton;