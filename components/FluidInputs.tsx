import { FC } from 'react';
import type { Fluid } from '../types';

interface FluidInputsProps {
  fluids: Fluid[];
  setFluids: React.Dispatch<React.SetStateAction<Fluid[]>>;
  label: string;
}

const FluidInputs: FC<FluidInputsProps> = ({ fluids, setFluids, label }) => {
  const updateFluid = (index: number, field: keyof Fluid, value: string) => {
    setFluids(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } as Fluid : f));
  };
  return (
    <div className="bg-slate-50 p-6 rounded-xl shadow-inner flex-1 min-w-[300px]">
      <h3 className="text-lg font-semibold mb-4 text-slate-700">{label}</h3>
      {fluids.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {fluids.map((fluid, index) => (
            <div key={`${label}-${fluid.label}-${index}`} className="p-3 bg-slate-100 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <span className="text-sm font-medium text-slate-600">Fluid</span>
                  <span className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-200 text-slate-700 text-center">{fluid.label}</span>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Volume (bbl)</span>
                  <input
                    type="number"
                    value={fluid.volume}
                    onChange={(e) => updateFluid(index, 'volume', e.target.value)}
                    className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Weight (ppg)</span>
                  <input
                    type="number"
                    value={fluid.ppg}
                    onChange={(e) => updateFluid(index, 'ppg', e.target.value)}
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
};

export default FluidInputs;
