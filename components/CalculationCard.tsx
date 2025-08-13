import React, { FC } from 'react';

interface CalculationCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const CalculationCard: FC<CalculationCardProps> = ({ title, children, className }) => (
  <div className={`bg-white p-4 rounded-xl shadow-md ${className || ''}`}>
    <h3 className="text-base font-semibold text-slate-800 mb-3 border-b pb-2">{title}</h3>
    <div className="space-y-2 text-sm">{children}</div>
  </div>
);

export default CalculationCard;
