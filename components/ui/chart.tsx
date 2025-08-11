import React from 'react';
import { cx } from '@/utils/cx';
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

export type ChartConfig = Record<string, { label: string; color: string }>;

export function ChartContainer(
  props: React.PropsWithChildren<{ className?: string; config?: ChartConfig }>
) {
  const { className = '', children } = props;
  // Access config for API compatibility (unused)
  if (props.config) {
    // no-op
  }
  return <div className={cx('w-full', className)}>{children}</div>;
}

export const ChartLegend: React.FC<{ content: React.ReactNode }> = ({ content }) => <>{content}</>;
export const ChartLegendContent: React.FC = () => null;

export function ChartTooltip(props: any) {
  const { children, ...rest } = props;
  return React.cloneElement(children, rest);
}

export function ChartTooltipContent(props: TooltipProps<ValueType, NameType>) {
  const { active, payload, label } = props as any;
  if (!(active && payload?.length)) return null;
  return (
    <div className="rounded-md bg-slate-800 text-white text-xs px-2 py-1 shadow-md">
      {label != null && <div className="font-semibold mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={(p && (p.dataKey || p.name)) ?? `k-${i}` } className="opacity-90">
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}
