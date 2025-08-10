import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { PlotConfig, PlotLineConfig } from '../types';

interface ChartProps {
  plot: PlotConfig;
}

const CustomTooltip = ({ active, payload, label, y_fields }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 backdrop-blur-sm p-3 shadow-lg rounded-md border border-slate-200">
        <p className="text-sm text-slate-600 font-semibold">{`Depth: ${label.toLocaleString()} ft`}</p>
        {payload.map((p: any, i: number) => (
            <p key={i} style={{color: p.color}} className="font-bold">{`${p.name}: ${p.value.toLocaleString(undefined, {maximumFractionDigits:0})}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

const Chart: React.FC<ChartProps> = ({ plot }) => {
  const renderChart = () => {
    switch (plot.type) {
      case 'bar':
        return (
          <BarChart data={plot.series} margin={{ top: 5, right: 20, left: 30, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey={plot.x_field} tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: plot.options.ylabel, angle: -90, position: 'insideLeft', offset: -20, style: {fontSize: '12px', fill: '#64748b'} }} />
            <Tooltip content={<CustomTooltip y_fields={plot.y_fields} />} />
            <Legend wrapperStyle={{fontSize: "12px"}} />
            <Bar dataKey={plot.y_fields[0].key} name={plot.y_fields[0].name} fill={plot.y_fields[0].color} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={plot.series} margin={{ top: 5, right: 20, left: 30, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey={plot.x_field} type="number" tick={{ fontSize: 11 }} domain={['dataMin', 'dataMax']} label={{ value: plot.options.xlabel, position: 'insideBottom', offset: -10, style: {fontSize: '12px', fill: '#64748b'} }} />
            <YAxis reversed={plot.options.invert_y} type="number" tick={{ fontSize: 11 }} domain={['auto', 'auto']} label={{ value: plot.options.ylabel, angle: -90, position: 'insideLeft', offset: -20, style: {fontSize: '12px', fill: '#64748b'} }} />
            <Tooltip content={<CustomTooltip y_fields={plot.y_fields} />} />
            <Legend wrapperStyle={{fontSize: "12px"}}/>
            {plot.y_fields.map((line: PlotLineConfig) => (
                 <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
            ))}
            {plot.options.threshold_lines?.map(line => (
                <ReferenceLine key={line.label} y={line.value} label={{ value: line.label, position: 'right', fill: line.color, fontSize: '10px' }} stroke={line.color} strokeDasharray="5 5" />
            ))}
          </LineChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">{plot.title}</h3>
        <ResponsiveContainer width="100%" height={300}>
            {renderChart()}
        </ResponsiveContainer>
    </div>
  );
};

export default Chart;