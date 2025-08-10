"use client"

import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ScenarioResult } from "@/lib/td-model"

// High-contrast, colorblind-friendly palette (Tableau-like + extras)
const PALETTE = [
  "#1f77b4", // blue
  "#d62728", // red
  "#2ca02c", // green
  "#9467bd", // purple
  "#ff7f0e", // orange
  "#17becf", // cyan
  "#8c564b", // brown
  "#e377c2", // pink
  "#7f7f7f", // gray
  "#bcbd22", // olive
  "#aec7e8", // light blue
  "#ff9896", // light red
]

// Dash patterns to further differentiate overlapping colors
const DASHES = ["", "6 3", "4 4", "2 3", "8 4 2 4", "1 4", "10 6", "3 6", "2 6", "12 6", "5 10", "10 2"]

export function ResultsCharts({ results = [] as ScenarioResult[] }) {
  if (!results.length) return null

  // Build metadata with consistent CSS variable keys
  const seriesMeta = results.map((r, i) => {
    const key = safeKey(r.scenarioName)
    const color = PALETTE[i % PALETTE.length]
    const dash = DASHES[i % DASHES.length]
    return { key, label: r.scenarioName, color, dash }
  })

  // Merge data by MD using our keys
  const mergedTension = mergeSeries(
    results.map((r, i) => ({ key: seriesMeta[i].key, series: r.series })),
    "tension",
  )
  const mergedTorque = mergeSeries(
    results.map((r, i) => ({ key: seriesMeta[i].key, series: r.series })),
    "torque",
  )

  // Chart config maps keys -> label/color for ChartContainer to expose CSS vars
  const chartConfig = Object.fromEntries(seriesMeta.map((m) => [m.key, { label: m.label, color: m.color }]))

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tension profile (Slack-off to target)</CardTitle>
          <CardDescription>
            Axial force along MD. Positive values are tension; negative are compression.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ChartContainer config={chartConfig} className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedTension} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                <XAxis dataKey="md" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis width={88} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Legend />
                {seriesMeta.map((m) => (
                  <Line
                    key={m.key}
                    dataKey={m.key}
                    type="monotone"
                    stroke={`var(--color-${m.key})`}
                    strokeWidth={2.5}
                    strokeDasharray={m.dash || undefined}
                    dot={false}
                    activeDot={{ r: 3 }}
                    name={m.label}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Torque profile (if rotating)</CardTitle>
          <CardDescription>
            Integrated torque up to MD during rotation. Zero for scenarios with rotation disabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ChartContainer config={chartConfig} className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedTorque} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                <XAxis dataKey="md" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis width={88} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Legend />
                {seriesMeta.map((m) => (
                  <Line
                    key={m.key}
                    dataKey={m.key}
                    type="monotone"
                    stroke={`var(--color-${m.key})`}
                    strokeWidth={2.5}
                    strokeDasharray={m.dash || undefined}
                    dot={false}
                    activeDot={{ r: 3 }}
                    name={m.label}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function mergeSeries(
  items: { key: string; series: { md: number; tension: number; torque: number }[] }[],
  field: "tension" | "torque",
) {
  const mdSet = new Set<number>()
  for (const it of items) for (const p of it.series) mdSet.add(p.md)
  const mds = Array.from(mdSet).sort((a, b) => a - b)
  return mds.map((md) => {
    const row: Record<string, number | null> & { md: number } = { md }
    for (const it of items) {
      const p = nearestPoint(it.series, md)
      row[it.key] = p ? p[field] : null
    }
    return row
  })
}

function nearestPoint(series: { md: number; tension: number; torque: number }[], md: number) {
  if (!series.length) return null
  let best = series[0]
  let bestD = Math.abs(series[0].md - md)
  for (const p of series) {
    const d = Math.abs(p.md - md)
    if (d < bestD) {
      best = p
      bestD = d
    }
  }
  return best
}

function safeKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}
