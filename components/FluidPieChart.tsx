import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import type { Fluid, MudConfig } from '@/types';
import { ChartLegendContent, ChartTooltipContent } from '@/components/application/charts/charts-base';

type Props = {
  mud: MudConfig;
  spacers: Fluid[];
  cements: Fluid[];
  displacements: Fluid[];
  title?: string;
};

const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#A855F7', '#84CC16', '#F97316'];

export default function FluidPieChart({ mud, spacers, cements, displacements, title = 'Fluid Volume Mix' }: Props) {
  // Aggregate volumes by group
  const toNum = (v?: string) => {
    const n = parseFloat(v || '0');
    return isNaN(n) ? 0 : n;
  };

  const spacerVol = spacers.reduce((a, f) => a + toNum(f.volume), 0);
  const cementVol = cements.reduce((a, f) => a + toNum(f.volume), 0);
  const dispVol = displacements.reduce((a, f) => a + toNum(f.volume), 0);
  // Mud is a density-only input; assume 0 volume unless included elsewhere
  const mudVol = 0;

  const data = [
    { name: 'Spacers', value: spacerVol, className: 'text-indigo-500' },
    { name: 'Cements', value: cementVol, className: 'text-green-500' },
    { name: 'Displacement', value: dispVol, className: 'text-amber-500' },
    { name: 'Mud (base)', value: mudVol, className: 'text-red-500' },
  ].filter(d => d.value > 0);

  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <h3 className="text-base font-semibold text-slate-800 mb-3">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">No volumes to display yet.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className={entry.className} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltipContent isPieChart />} />
              <Legend content={<ChartLegendContent align="center" />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 text-center text-xs text-slate-500">Total: {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} bbl</div>
        </div>
      )}
    </div>
  );
}
