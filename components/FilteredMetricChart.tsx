// ============================================================================
// === Main Component: FilteredMetricChart ====================================
// A responsive, filterable, animated category bar chart with hover + click
// selection, optimized re-renders, and Tailwind utility styling.
// ============================================================================

// --- Imports ----------------------------------------------------------------
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { cn } from '../lib/utils';

// --- Constants & Configurations --------------------------------------------
const BASE_CHART_HEIGHT = 300;            // Default desktop height
const MIN_BAR_WIDTH = 14;                 // Minimum width per bar for legibility
const MAX_BAR_WIDTH = 48;                 // Cap width so few items don't look chunky
const H_PADDING_PX = 8;                   // Horizontal padding inside chart container
const CATEGORY_COLORS: Record<string, string> = {
    Torque: 'bg-blue-500',
    Drag: 'bg-red-500',
    Weight: 'bg-green-500',
    Pressure: 'bg-yellow-500'
};

// --- Types ------------------------------------------------------------------
export interface DataPoint { id: string; category: string; value: number; label: string; color?: string; }
export interface FilteredMetricChartProps { data: DataPoint[]; title?: string; height?: number; multiSelectCategories?: boolean; }

// --- Utility Functions ------------------------------------------------------
const formatValue = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

// Compute dynamic bar width based on available width and item count
const computeBarWidth = (containerWidth: number, count: number): number => {
    if (!containerWidth || count === 0) return MIN_BAR_WIDTH;
    const raw = (containerWidth - H_PADDING_PX * 2) / count - 6; // account gap
    return Math.min(Math.max(raw, MIN_BAR_WIDTH), MAX_BAR_WIDTH);
};

// --- Subcomponents (Filters, Chart, Tooltip, etc.) --------------------------
const CategoryFilter: React.FC<{ categories: string[]; selected: string[]; toggle: (c: string) => void; }> = ({ categories, selected, toggle }) => (
    <div className="flex flex-wrap gap-2 p-2 mb-3 bg-slate-50 rounded-md border border-slate-200">
        {categories.map(c => {
            const active = selected.includes(c);
            return (
                    <button
                    key={c}
                    onClick={() => toggle(c)}
                    className={cn(
                        'px-3 py-1 text-xs md:text-sm font-medium rounded-full tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                        active ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    )}
                >{c}</button>
            );
        })}
    </div>
);

const ChartTooltip: React.FC<{ point: DataPoint | null; coords: { x: number; y: number } | null; }> = ({ point, coords }) => {
    if (!point || !coords) return null;
    return (
        <div
            className="pointer-events-none absolute z-20 rounded-md bg-slate-900/90 px-3 py-2 text-[10px] md:text-xs text-white shadow-lg backdrop-blur-sm"
            style={{ left: coords.x + 8, top: coords.y - 8 }}
            role="tooltip"
        >
            <div className="font-semibold leading-tight mb-0.5">{point.label}</div>
            <div className="flex items-center gap-1 capitalize">
                <span className="opacity-70">{point.category}:</span>
                <span className="font-medium tabular-nums">{formatValue(point.value)}</span>
            </div>
        </div>
    );
};

// Single Bar (memoized to avoid unnecessary re-renders)
interface BarProps { point: DataPoint; maxValue: number; barHeight: number; width: number; active: boolean; selected: boolean; onHover: (p: DataPoint | null, evt: React.MouseEvent | React.TouchEvent) => void; onSelect: (p: DataPoint) => void; }
const Bar: React.FC<BarProps> = React.memo(({ point, maxValue, barHeight, width, active, selected, onHover, onSelect }) => {
    const h = maxValue > 0 ? (point.value / maxValue) * barHeight : 0;
    const color = point.color || CATEGORY_COLORS[point.category] || 'bg-slate-400';
    return (
        <motion.button
            layout
            type="button"
            onClick={() => onSelect(point)}
            onMouseEnter={(e) => onHover(point, e)}
            onMouseLeave={(e) => onHover(null, e)}
            onTouchStart={(e) => onHover(point, e)}
            onTouchEnd={(e) => onHover(null, e)}
            className={cn('group relative flex flex-col items-stretch justify-end rounded-sm focus:outline-none focus-visible:ring-2 ring-blue-500/60 transition-colors', selected ? 'ring-2 ring-offset-1 ring-blue-500/70' : '')}
            style={{ width }}
            aria-label={`${point.label} ${point.category} ${formatValue(point.value)}`}
        >
            <motion.div
                layout
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: h, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 170, damping: 26 }}
                className={cn('w-full rounded-t-sm shadow-sm relative overflow-hidden', color, active ? 'brightness-110' : 'brightness-95 group-hover:brightness-110', selected ? 'outline outline-2 outline-white' : '')}
            >
                {/* Value label inside bar if tall enough */}
                {h > 46 && (
                    <div className="absolute inset-x-0 bottom-1 text-[10px] md:text-[11px] font-semibold text-white/95 text-center drop-shadow-sm select-none">
                        {formatValue(point.value)}
                    </div>
                )}
            </motion.div>
            <div className="mt-1 w-full truncate text-center text-[10px] md:text-xs text-slate-600/90 font-medium select-none">
                {point.label}
            </div>
        </motion.button>
    );
});
Bar.displayName = 'Bar';

// --- Main Component Logic ---------------------------------------------------
export const FilteredMetricChart: React.FC<FilteredMetricChartProps> = ({ data, title = 'Metrics', height = BASE_CHART_HEIGHT, multiSelectCategories = true }) => {
    const [categoryFilters, setCategoryFilters] = useState<string[]>([]);           // Active category filters
    const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set()); // Persist selected bars
    const [hovered, setHovered] = useState<DataPoint | null>(null);
    const [tooltipCoords, setTooltipCoords] = useState<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Distinct categories
    const categories = useMemo(() => Array.from(new Set(data.map(d => d.category))), [data]);

    // Filtered dataset (category filters). If none selected, show all.
    const filtered = useMemo(() => categoryFilters.length ? data.filter(d => categoryFilters.includes(d.category)) : data, [data, categoryFilters]);

    // Max value for scale (guard zero-length)
    const maxValue = useMemo(() => filtered.reduce((m, d) => d.value > m ? d.value : m, 0), [filtered]);

    // Toggle category filter logic
    const toggleCategory = useCallback((c: string) => {
        setCategoryFilters(prev => {
            if (!multiSelectCategories) return prev.includes(c) ? [] : [c];
            return prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c];
        });
    }, [multiSelectCategories]);

    // Handle selection (toggle point) without recreating set reference needlessly
    const handleSelectPoint = useCallback((p: DataPoint) => {
        setSelectedPointIds(prev => {
            const next = new Set(prev);
            if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
            return next;
        });
    }, []);

    // Hover events unify mouse/touch
    const handleHover = useCallback((p: DataPoint | null, evt: React.MouseEvent | React.TouchEvent) => {
        setHovered(p);
                if (p) {
                    const touchEvent = 'touches' in evt ? evt.touches?.[0] : undefined;
                    const clientX = touchEvent ? touchEvent.clientX : (evt as React.MouseEvent).clientX;
                    const clientY = touchEvent ? touchEvent.clientY : (evt as React.MouseEvent).clientY;
            const bounds = containerRef.current?.getBoundingClientRect();
            if (bounds) setTooltipCoords({ x: clientX - bounds.left, y: clientY - bounds.top });
        } else setTooltipCoords(null);
    }, []);

    // Responsive bar width based on container width and number of items
        const barWidth = useMemo(() => computeBarWidth(containerRef.current?.offsetWidth || 0, filtered.length), [filtered.length]);
        const barAreaWidth = barWidth * filtered.length + (filtered.length - 1) * 6 + H_PADDING_PX * 2; // include gaps

    // --- Rendering ------------------------------------------------------------
    return (
            <div className="p-4 rounded-lg bg-white shadow-md flex flex-col" ref={containerRef}>
            <h3 className="mb-2 text-base md:text-lg font-semibold text-slate-800 tracking-tight">{title}</h3>
            <CategoryFilter categories={categories} selected={categoryFilters} toggle={toggleCategory} />
                <div className="relative flex-1 select-none min-h-[300px]">
                    <div className="absolute inset-0 flex items-end overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300/70 px-2">
                    <LayoutGroup id="bars">
                    <div className={cn('flex items-end gap-1.5 mx-auto',
                            barAreaWidth < 640 ? 'min-w-[640px]' : barAreaWidth < 880 ? 'min-w-[880px]' : barAreaWidth < 1200 ? 'min-w-[1200px]' : 'min-w-[1600px]'
                        )}>
                            <AnimatePresence initial={false}>
                                {filtered.map(point => (
                                    <Bar
                                        key={point.id}
                                        point={point}
                                        maxValue={maxValue}
                                        barHeight={height - 40}
                                        width={barWidth}
                                        active={hovered?.id === point.id}
                                        selected={selectedPointIds.has(point.id)}
                                        onHover={handleHover}
                                        onSelect={handleSelectPoint}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </LayoutGroup>
                </div>
                <ChartTooltip point={hovered} coords={tooltipCoords} />
                {!filtered.length && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs md:text-sm text-slate-500">No data for selected filters.</div>
                )}
            </div>
            {/* Selected summary */}
            {selectedPointIds.size > 0 && (
                <div className="mt-3 rounded-md bg-slate-50 border border-slate-200 p-2 text-[10px] md:text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                    {[...selectedPointIds].map(id => {
                        const p = data.find(d => d.id === id);
                        if (!p) return null;
                        return <span key={id} className="inline-flex items-center gap-1">{p.label}<span className="font-semibold">{formatValue(p.value)}</span></span>;
                    })}
                    <button type="button" onClick={() => setSelectedPointIds(new Set())} className="ml-auto underline decoration-dotted hover:text-slate-800">Clear</button>
                </div>
            )}
        </div>
    );
};

export default FilteredMetricChart;
