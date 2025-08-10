"use client"

import { useId } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import type { Scenario } from "@/lib/td-model"
import { FrictionSectionsEditor } from "@/components/friction-sections-editor"
import { PipeSpecEditor } from "@/components/pipe-spec-editor"
import { FluidsEditor } from "@/components/fluids-editor"
import { FluidSectionsEditor } from "@/components/fluid-sections-editor"

export function ScenarioForm({
  scenario = defaultScenarioProp,
  onChange = () => {},
}: {
  scenario?: Scenario
  onChange?: (patch: Partial<Scenario>) => void
}) {
  const ids = {
    name: useId(),
    mu: useId(),
    rotate: useId(),
    setdown: useId(),
    seg: useId(),
  }
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor={ids.name}>Scenario name</Label>
        <Input id={ids.name} value={scenario.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>

      {/* Strings */}
      <div className="grid gap-4">
        <div className="text-sm font-medium">Strings</div>
        <div className="grid gap-4">
          <PipeSpecEditor
            title="Parent casing"
            value={scenario.parentCasing}
            onChange={(v) => onChange({ parentCasing: v })}
          />
          <PipeSpecEditor title="Liner" value={scenario.liner} onChange={(v) => onChange({ liner: v })} />
          <PipeSpecEditor title="Drill pipe 1" value={scenario.dp1} onChange={(v) => onChange({ dp1: v })} />
          <PipeSpecEditor title="Drill pipe 2" value={scenario.dp2} onChange={(v) => onChange({ dp2: v })} />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Active string for run-in</Label>
            <Select value={scenario.activeString} onValueChange={(v) => onChange({ activeString: v as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="liner">Liner</SelectItem>
                <SelectItem value="dp1">Drill pipe 1</SelectItem>
                <SelectItem value="dp2">Drill pipe 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.mu}>Default friction coefficient μ</Label>
            <Input
              id={ids.mu}
              type="number"
              min={0}
              step="0.01"
              value={scenario.mu}
              onChange={(e) => onChange({ mu: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.setdown}>Target set-down at liner top (lbf)</Label>
            <Input
              id={ids.setdown}
              type="number"
              min={0}
              step="100"
              value={scenario.targetSetdown}
              onChange={(e) => onChange({ targetSetdown: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-end gap-3">
            <Switch id={ids.rotate} checked={scenario.rotate} onCheckedChange={(v) => onChange({ rotate: v })} />
            <Label htmlFor={ids.rotate}>Rotate while running</Label>
          </div>
        </div>
      </div>

      {/* Fluids */}
      <div className="grid gap-4">
        <div className="text-sm font-medium">Fluids program</div>
        <FluidsEditor value={scenario.fluids} onChange={(v) => onChange({ fluids: v })} />
        <FluidSectionsEditor
          program={scenario.fluids}
          sections={scenario.fluidSections || []}
          onChange={(next) => onChange({ fluidSections: next })}
        />
      </div>

      {/* Friction */}
      <FrictionSectionsEditor
        sections={scenario.frictionSections || []}
        onChange={(next) => onChange({ frictionSections: next })}
      />

      {/* Solver controls */}
      <div className="grid gap-2">
        <Label htmlFor={ids.seg}>Computation step (ft)</Label>
        <Input
          id={ids.seg}
          type="number"
          min={1}
          step="1"
          value={scenario.segmentFt}
          onChange={(e) => onChange({ segmentFt: Number(e.target.value) })}
        />
      </div>
    </div>
  )
}

import type { PipeSpec, FluidProgram } from "@/lib/td-model"
const defaultScenarioProp: Scenario = {
  name: "Scenario",
  parentCasing: { name: 'Parent casing 7"', od_in: 7.0, id_in: 6.1, weight_lbft: 26.0 } as PipeSpec,
  liner: { name: 'Liner 5-1/2"', od_in: 5.5, id_in: 4.5, weight_lbft: 20.0 } as PipeSpec,
  dp1: { name: 'DP 5" HW', od_in: 5.0, id_in: 3.5, weight_lbft: 19.5 } as PipeSpec,
  dp2: { name: 'DP 3-1/2"', od_in: 3.5, id_in: 2.5, weight_lbft: 13.3 } as PipeSpec,
  activeString: "liner",
  mu: 0.24,
  frictionSections: [],
  rotate: false,
  targetSetdown: 15000,
  segmentFt: 25,
  fluids: {
    mud: { name: "Mud", density_ppg: 10.0 },
    displacement: [
      { name: "Diesel pill", density_ppg: 7.2 },
      { name: "Brine", density_ppg: 9.2 },
      { name: "Spacer Light", density_ppg: 9.5 },
    ],
    spacers: [
      { name: "Spacer 1", density_ppg: 10.0 },
      { name: "Spacer 2", density_ppg: 10.5 },
      { name: "Spacer 3", density_ppg: 11.0 },
    ],
    cements: [
      { name: "Lead cement", density_ppg: 12.5 },
      { name: "Tail cement", density_ppg: 15.8 },
      { name: "Light cement", density_ppg: 11.5 },
    ],
  } as FluidProgram,
  fluidSections: [],
}
