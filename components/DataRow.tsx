import { FC } from 'react';

interface DataRowProps {
  label: string;
  value: string | number;
  unit: string;
  className?: string;
}

const DataRow: FC<DataRowProps> = ({ label, value, unit, className }) => (
  <div className="flex justify-between items-center">
    <span className="text-slate-600">{label}:</span>
    <span className={`font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded ${className || ''}`}>
      {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value} {' '}
      <span className="text-xs text-slate-500">{unit}</span>
    </span>
  </div>
);

export default DataRow;
