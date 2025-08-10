import type { ParsedPipeConfig, SurveyRow } from '../types';

export interface TorqueDragInputs {
    survey: { md: number, tvd: number, incl: number }[];
    string: {
        id: string;
        from: number;
        to: number;
        od: number;
        id_tube: number;
        wt: number;
    }[];
    mudWeight: number; // ppg
    casingFriction: number;
    openHoleFriction: number;
    casingShoeMd: number;
}

export interface TorqueDragPoint {
    depth: number;
    hookload_in: number;
    hookload_out: number;
    torque: number;
    drag: number;
}

export interface TorqueDragResult {
    plotData: TorqueDragPoint[];
    summary: string;
}

const degreesToRadians = (deg: number) => deg * (Math.PI / 180);

export const calculateTorqueDrag = (inputs: TorqueDragInputs): TorqueDragResult => {
    const { survey, string, mudWeight, casingFriction, openHoleFriction, casingShoeMd } = inputs;
    if (survey.length < 2) {
        return { plotData: [], summary: "Insufficient survey data for T&D calculation." };
    }

    const buoyancyFactor = (65.5 - mudWeight) / 65.5;
    const plotData: TorqueDragPoint[] = [];

    let hookloadIn = 0;
    let hookloadOut = 0;
    let torque = 0;

    // Calculation from top to bottom (for tripping in)
    for (let i = 1; i < survey.length; i++) {
        const p1 = survey[i - 1];
        const p2 = survey[i];

        const midDepth = (p1.md + p2.md) / 2;
        const segmentLength = p2.md - p1.md;
        const avgIncl = degreesToRadians((p1.incl + p2.incl) / 2);

        const currentPipe = string.find(s => midDepth >= s.from && midDepth <= s.to);
        if (!currentPipe) continue;

        const frictionFactor = midDepth <= casingShoeMd ? casingFriction : openHoleFriction;
        const buoyedWeightPerFt = currentPipe.wt * buoyancyFactor;

        const weightComponent = buoyedWeightPerFt * segmentLength * Math.cos(avgIncl);
        const normalForce = buoyedWeightPerFt * segmentLength * Math.sin(avgIncl);
        const friction = normalForce * frictionFactor;

        hookloadIn += weightComponent + friction; // Adding friction when tripping in
        
        plotData.push({
            depth: p2.md,
            hookload_in: hookloadIn,
            hookload_out: 0, // will be calculated next
            torque: 0, // will be calculated next
            drag: friction,
        });
    }

    // Calculation from bottom to top (for tripping out and rotating)
    for (let i = survey.length - 1; i > 0; i--) {
        const p1 = survey[i - 1];
        const p2 = survey[i];

        const midDepth = (p1.md + p2.md) / 2;
        const segmentLength = p2.md - p1.md;
        const avgIncl = degreesToRadians((p1.incl + p2.incl) / 2);

        const currentPipe = string.find(s => midDepth >= s.from && midDepth <= s.to);
        if (!currentPipe) continue;

        const frictionFactor = midDepth <= casingShoeMd ? casingFriction : openHoleFriction;
        const buoyedWeightPerFt = currentPipe.wt * buoyancyFactor;

        const weightComponent = buoyedWeightPerFt * segmentLength * Math.cos(avgIncl);
        const normalForce = buoyedWeightPerFt * segmentLength * Math.sin(avgIncl);
        const friction = normalForce * frictionFactor;
        
        hookloadOut += weightComponent - friction; // Subtracting friction when tripping out
        torque += friction * (currentPipe.od / 2 / 12); // in ft-lbs

        const plotPoint = plotData.find(p => p.depth === p1.md);
        if(plotPoint) {
            plotPoint.hookload_out = hookloadOut;
            plotPoint.torque = torque;
        }
    }
    
    // Reverse arrays to be from surface to TD
    plotData.reverse();
    
    const maxHookload = Math.max(...plotData.map(p => p.hookload_out));
    const maxTorque = Math.max(...plotData.map(p => p.torque));
    const maxDrag = maxHookload - Math.min(...plotData.map(p => p.hookload_in));

    const summary = `
**T&D Analysis Summary:**
- **Max Hookload (Trip Out):** ${maxHookload.toLocaleString(undefined, {maximumFractionDigits: 0})} lbs
- **Max Surface Torque (Rotating):** ${maxTorque.toLocaleString(undefined, {maximumFractionDigits: 0})} ft-lbs
- **Max Drag:** ${maxDrag.toLocaleString(undefined, {maximumFractionDigits: 0})} lbs
- **Friction Factors Used:** Cased: ${casingFriction}, Open Hole: ${openHoleFriction}
    `;

    return { plotData, summary };
};
