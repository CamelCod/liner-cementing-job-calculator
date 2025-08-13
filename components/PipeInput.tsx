import React, { FC, ChangeEvent } from 'react';
import type { PipeConfig } from '../types';

interface PipeInputProps {
  label: string;
  pipe: PipeConfig;
  setPipe: React.Dispatch<React.SetStateAction<PipeConfig>>;
  pipeData: { od: string; id: string; wt: string; grade?: string }[];
  gradeOptions?: string[];
  gradeLabel?: string;
  disabled?: boolean;
  /**
   * Optional callback to derive MD/TVD for drill pipe when user edits length or MD.
   * Should return an object { md: string; tvd: string } or null to skip.
   */
  deriveDepths?: (current: PipeConfig) => { md: string; tvd: string } | null;
}

const PipeInput: FC<PipeInputProps> = ({ label, pipe, setPipe, pipeData, gradeOptions, gradeLabel, disabled = false, deriveDepths }) => {
  const inputClasses = 'mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 disabled:bg-slate-200 disabled:cursor-not-allowed';
  const readOnlyClasses = 'mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-200 text-slate-600 cursor-not-allowed text-center';
  const idBase = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Broaden drill pipe detection so labels like "DP1 (Upper)" / "DP2 (Lower)" are recognized
  const isDrillPipe = /(^dp\d|drill\s*pipe)/i.test(label);

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
    setPipe(prev => {
      const updated = { ...prev, [name]: value } as PipeConfig;
      if (deriveDepths && /(^dp\d|drill\s*pipe)/i.test(label)) {
        const depths = deriveDepths(updated);
        if (depths) {
          updated.md = depths.md;
          updated.tvd = depths.tvd;
        }
      }
      return updated;
    });
  };

  return (
    <div className={`bg-slate-50 p-4 rounded-xl shadow-inner ${disabled ? 'opacity-50' : ''}`}>
      <h3 className="text-lg font-semibold mb-4 text-slate-800">{label}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
        {gradeOptions && (
          <label className="block">
            <span className="text-sm font-medium text-slate-600">{gradeLabel || 'Grade'}</span>
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
          <label className="block col-span-2" htmlFor={`${idBase}-md`}>
            <span className="text-sm font-medium text-slate-600">Shoe MD (ft)</span>
            <input id={`${idBase}-md`} name="md" type="number" value={pipe.md} onChange={handleGenericChange} className={inputClasses} disabled={disabled} />
          </label>
          <label className="block col-span-2">
            <span className="text-sm font-medium text-slate-600">Shoe TVD (ft)</span>
            <span className={readOnlyClasses}>{pipe.tvd}</span>
          </label>
        </div>
      )}
  {isDrillPipe && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end mt-4">
          <label className="block" htmlFor={`${idBase}-length`}>
            <span className="text-sm font-medium text-slate-600">Length (ft)</span>
            <input id={`${idBase}-length`} name="length" type="number" value={pipe.length} onChange={handleGenericChange} className={inputClasses} disabled={disabled} />
          </label>
          <label className="block" htmlFor={`${idBase}-md-dp`}>
            <span className="text-sm font-medium text-slate-600">Bottom MD (ft)</span>
            <input id={`${idBase}-md-dp`} name="md" type="number" value={pipe.md} onChange={handleGenericChange} className={inputClasses} disabled={disabled} />
          </label>
          <label className="block col-span-2">
            <span className="text-sm font-medium text-slate-600">Bottom TVD (ft)</span>
            <span className={readOnlyClasses}>{pipe.tvd}</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default PipeInput;
