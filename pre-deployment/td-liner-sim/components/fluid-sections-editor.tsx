"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FluidProgram, FluidSection, FluidRef } from "@/lib/td-model"
import { Plus, Trash2 } from "lucide-react"

export function FluidSectionsEditor({
  program,
  sections = [],
  onChange = () => {},
}: {
  program: FluidProgram
  sections?: FluidSection[]
  onChange?: (next: FluidSection[]) => void
}) {
  const add = () => onChange([...(sections || []), { fromMD: 0, toMD: 1000, ref: { kind: "mud" } }])
  const update = (i: number, patch: Partial<FluidSection>) =>
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  const remove = (i: number) => onChange(sections.filter((_, idx) => idx !== i))

  const refToStr = (ref: FluidRef) => {
    if (ref.kind === "mud") return "mud"
    return `${ref.kind}:${ref.index}`
  }
  const strToRef = (v: string): FluidRef => {
    if (v === "mud") return { kind: "mud" }
    const [kind, idx] = v.split(":")
    const index = Number(idx)
    if (kind === "displacement") return { kind: "displacement", index }
    if (kind === "spacer") return { kind: "spacer", index }
    return { kind: "cement", index }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Fluid sections by depth (for buoyancy)</div>
        <Button size="sm" variant="secondary" onClick={add}>
          <Plus className="w-4 h-4 mr-2" />
          Add section
        </Button>
      </div>

      <div className="rounded-md border divide-y">
        {sections.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">No sections. Default fluid is Mud for all depths.</div>
        ) : (
          sections.map((s, i) => (
            <div key={i} className="p-3 grid md:grid-cols-[1fr_1fr_2fr_auto] gap-3 items-end">
              <div className="space-y-1">
                <Label>From MD (ft)</Label>
                <Input
                  type="number"
                  step="10"
                  value={s.fromMD}
                  onChange={(e) => update(i, { fromMD: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>To MD (ft)</Label>
                <Input
                  type="number"
                  step="10"
                  value={s.toMD}
                  onChange={(e) => update(i, { toMD: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Fluid</Label>
                <Select value={refToStr(s.ref)} onValueChange={(v) => update(i, { ref: strToRef(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mud">
                      Mud — {program.mud.name} ({program.mud.density_ppg} ppg)
                    </SelectItem>
                    {program.displacement.map((f, idx) => (
                      <SelectItem key={`d-${idx}`} value={`displacement:${idx}`}>
                        Displacement #{idx + 1} — {f.name} ({f.density_ppg} ppg)
                      </SelectItem>
                    ))}
                    {program.spacers.map((f, idx) => (
                      <SelectItem key={`s-${idx}`} value={`spacer:${idx}`}>
                        Spacer #{idx + 1} — {f.name} ({f.density_ppg} ppg)
                      </SelectItem>
                    ))}
                    {program.cements.map((f, idx) => (
                      <SelectItem key={`c-${idx}`} value={`cement:${idx}`}>
                        Cement #{idx + 1} — {f.name} ({f.density_ppg} ppg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-end">
                <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Depths not covered by a section use Mud by default. Sections are inclusive and evaluated in order after sorting.
      </p>
    </div>
  )
}
