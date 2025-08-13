/* cSpell:words hookload setdown Hookload targetSetdown */
import type { TorqueDragPoint, TorqueDragResult } from '../types';

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
    rotate?: boolean; // include torque accumulation
    targetSetdown?: number; // desired compression at target MD (lbs)
    segmentFt?: number; // discretization step
}

// ---- Start: Adapted from pre-deployment/td-liner-sim/lib/td-model.ts ----
type SurveyPoint = { md: number; inc: number; azi: number };

function buoyancyFactorFromPPG(mud_ppg: number) {
    return 1 - mud_ppg / 65.4;
}

function deg2rad(d: number) {
    return (d * Math.PI) / 180;
}

function interpAtMD(survey: SurveyPoint[], md: number): SurveyPoint | null {
    if (survey.length === 0) return null;
    const first = survey[0];
    const last = survey[survey.length - 1];
    if (!first || !last) return null;
    
    if (md <= first.md) return first;
    if (md >= last.md) return last;
    
    let i = 1;
    while (i < survey.length && survey[i]?.md !== undefined && survey[i]!.md < md) i++;
    
    const a = survey[i - 1];
    const b = survey[i];
    if (!a || !b) return first; // fallback
    
    const t = (md - a.md) / (b.md - a.md);
    return {
        md,
        inc: a.inc + (b.inc - a.inc) * t,
        azi: a.azi + (b.azi - a.azi) * t,
    } as SurveyPoint;
}

function discretizeSurvey(survey: SurveyPoint[], stepFt: number, toMD: number) {
    const sorted = [...survey].sort((a, b) => a.md - b.md);
    if (sorted.length === 0) return [];
    
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) return [];
    
    const startMD = first.md;
    const endMD = Math.min(toMD, last.md);
    const path: { md: number; inc: number }[] = [];
    let md = startMD;
    while (md < endMD - 1e-9) {
        const interpResult = interpAtMD(sorted, md);
        if (interpResult) {
            path.push({ md, inc: interpResult.inc });
        }
        md = Math.min(md + stepFt, endMD);
    }
    const endInterpResult = interpAtMD(sorted, endMD);
    if (endInterpResult) {
        path.push({ md: endMD, inc: endInterpResult.inc });
    }
    return path;
}

function makeMuAt(defaultMu: number, casingShoeMd: number, casingMu: number, openHoleMu: number) {
    const sections = [
        { fromMD: -Infinity, toMD: casingShoeMd, mu: casingMu },
        { fromMD: casingShoeMd, toMD: Infinity, mu: openHoleMu },
    ];
    return (md: number) => {
        for (const s of sections) {
            if (md >= s.fromMD && md <= s.toMD) return s.mu;
        }
        return defaultMu;
    };
}

function simulateSlackOffProfile(params: {
    survey: SurveyPoint[];
    toMD: number;
    segmentFt: number;
    muAt: (md: number) => number;
    w_buoyed_at: (md: number) => number;
    rotate: boolean;
    r_eff_ft: number;
    surfaceForce: number;
}) {
    const { survey, toMD, segmentFt, muAt, w_buoyed_at, rotate, r_eff_ft, surfaceForce } = params;
    const path = discretizeSurvey(survey, segmentFt, toMD);
    if (path.length === 0) return { series: [], forceAtTarget: surfaceForce };
    
    let F = surfaceForce;
    let M = 0;
    const firstPoint = path[0];
    if (!firstPoint) return { series: [], forceAtTarget: surfaceForce };
    
    const series: { md: number; tension: number; torque: number }[] = [{ md: firstPoint.md, tension: F, torque: M }];
    for (let i = 1; i < path.length; i++) {
        const prevPoint = path[i - 1];
        const currentPoint = path[i];
        if (!prevPoint || !currentPoint) continue;
        
        const mdMid = 0.5 * (prevPoint.md + currentPoint.md);
        const ds = currentPoint.md - prevPoint.md;
        const inc = deg2rad(currentPoint.inc);
        const w_buoyed = w_buoyed_at(mdMid);
        const g_per_len = w_buoyed * Math.cos(inc);
        const n_per_len = w_buoyed * Math.sin(inc);
        const mu = muAt(mdMid);
        const f_per_len = mu * n_per_len;
        F += (g_per_len + f_per_len) * ds;
        if (rotate) {
            M += f_per_len * r_eff_ft * ds;
        }
        series.push({ md: currentPoint.md, tension: F, torque: M });
    }
    const lastPoint = series[series.length - 1];
    return { series, forceAtTarget: lastPoint?.tension || surfaceForce };
}

function solveSurfaceForTarget(params: {
    survey: SurveyPoint[];
    targetMD: number;
    segmentFt: number;
    muAt: (md: number) => number;
    w_buoyed_at: (md: number) => number;
    rotate: boolean;
    r_eff_ft: number;
    targetCompression: number;
}) {
    const { survey, targetMD, segmentFt, muAt, w_buoyed_at, rotate, r_eff_ft, targetCompression } = params;
    const targetForceAtMD = -Math.abs(targetCompression);
    let lo = 0;
    let hi = 1_000_000;
    let bestSeries: { md: number; tension: number; torque: number }[] = [];
    let bestF = hi;
    for (let k = 0; k < 60; k++) {
        const mid = 0.5 * (lo + hi);
        const { series, forceAtTarget } = simulateSlackOffProfile({
            survey,
            toMD: targetMD,
            segmentFt,
            muAt,
            w_buoyed_at,
            rotate,
            r_eff_ft,
            surfaceForce: mid,
        });
        if (forceAtTarget > targetForceAtMD) hi = mid; else lo = mid;
        bestSeries = series;
        bestF = mid;
        if (Math.abs(forceAtTarget - targetForceAtMD) < 1e-3) break;
    }
    return { converged: true, surfaceForce: bestF, series: bestSeries };
}
// ---- End: Adapted helpers ----

export const calculateTorqueDrag = (inputs: TorqueDragInputs): TorqueDragResult => {
    const { survey, string, mudWeight, casingFriction, openHoleFriction, casingShoeMd, rotate = true, targetSetdown = 15000, segmentFt = 25 } = inputs;
    if (survey.length < 2) {
        return { plotData: [], summary: 'Insufficient survey data for T&D calculation.' };
    }

    // Build SurveyPoint list (no azi in current app, assume 0)
    const svy: SurveyPoint[] = survey
        .map((r) => ({ md: r.md, inc: r.incl, azi: 0 }))
        .sort((a, b) => a.md - b.md);

    // Choose an active pipe approximation (use deepest DP if present; else use first string)
    const active = [...string].sort((a, b) => b.to - a.to)[0] || string[0];
    const r_eff_ft = (active?.od || 0) / 2 / 12; // ft
    const wAir = active?.wt || 0; // lb/ft

    // Depth-dependent buoyed weight based on mud ppg
    const bf = buoyancyFactorFromPPG(mudWeight);
    const w_buoyed = wAir * bf;
    const w_buoyed_at = (_md: number) => w_buoyed;

    const muAt = makeMuAt(casingFriction, casingShoeMd, casingFriction, openHoleFriction);

    const lastPoint = svy[svy.length - 1];
    if (!lastPoint) {
        return {
            plotData: [],
            summary: "No survey data available",
        };
    }
    const targetMD = lastPoint.md;

    const { series, surfaceForce } = solveSurfaceForTarget({
        survey: svy,
        targetMD,
        segmentFt,
        muAt,
        w_buoyed_at,
        rotate,
        r_eff_ft,
        targetCompression: targetSetdown,
    });

    const plotData: TorqueDragPoint[] = series.map((s, i, arr) => {
        let prevTension = 0;
        if (i > 0) {
            const prevItem = arr[i - 1];
            if (prevItem) {
                prevTension = prevItem.tension;
            }
        }
        return {
            depth: s.md,
            hookload_in: 0, // not modeled separately in this solver
            hookload_out: s.tension,
            torque: s.torque,
            drag: i > 0 ? Math.max(0, s.tension - prevTension) : 0,
        };
    });

    const maxHookload = plotData.reduce((m, p) => Math.max(m, p.hookload_out), 0);
    const maxTorque = plotData.reduce((m, p) => Math.max(m, p.torque), 0);
    const maxDrag = plotData.reduce((m, p) => Math.max(m, p.drag), 0);

    const summary = `
**T&D Analysis (Soft-string)**
- Surface Setdown to reach target: ${surfaceForce.toLocaleString(undefined, { maximumFractionDigits: 0 })} lbs
- Max Hookload (tension at depth): ${maxHookload.toLocaleString(undefined, { maximumFractionDigits: 0 })} lbs
- Max Surface Torque${rotate ? '' : ' (rotation disabled)'}: ${maxTorque.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft-lbs
- Max Drag (approx): ${maxDrag.toLocaleString(undefined, { maximumFractionDigits: 0 })} lbs
- Friction Factors: Cased ${casingFriction}, Open Hole ${openHoleFriction}
`;

    return { plotData, summary };
};