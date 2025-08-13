import React, { FC } from 'react';
import { CircleChevronDown, CircleChevronUp } from 'lucide-react';

interface FluidControlProps {
  label: string;
  count: number;
  setCount: React.Dispatch<React.SetStateAction<number>>;
}

const FluidControl: FC<FluidControlProps> = ({ label, count, setCount }) => (
  <div className="flex items-center justify-between p-2">
    <span className="text-slate-700">{label}</span>
    <div className="flex items-center space-x-2">
      <button onClick={() => setCount(Math.max(0, count - 1))} aria-label={`Decrease ${label}`} title={`Decrease ${label}`} className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"><CircleChevronDown size={20} /></button>
      <span className="font-bold w-4 text-center">{count}</span>
      <button onClick={() => setCount(count + 1)} aria-label={`Increase ${label}`} title={`Increase ${label}`} className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"><CircleChevronUp size={20} /></button>
    </div>
  </div>
);

export default FluidControl;
