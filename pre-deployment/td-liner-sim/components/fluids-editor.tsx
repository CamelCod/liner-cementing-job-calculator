"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FluidProgram, FluidSpec } from "@/lib/td-model"
import { Plus, Trash2 } from "lucide-react"

function FluidList({
  title,
  items,
  onChange = () => {},
  max = 3,
}: {
  title: string
  items: FluidSpec[]
  onChange?: (next: FluidSpec[]) => void
  max?: number
}) {
  const add = () => {
    if (items.length >= max) return
    onChange([...items, { name: `${title} ${items.length + 1}`, density_ppg: 10 }])
  }
  const update = (i: number, patch: Partial<FluidSpec>) => {
    onChange(items.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  }
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <Button size="sm" variant="secondary" onClick={add} disabled={items.length >= max}>
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>
      <div className="grid gap-3">
        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground">None added.</div>
        ) : (
          items.map((f, i) => (
            <div key={i} className="rounded-md border p-3 grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={f.name} onChange={(e) => update(i, { name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Density (ppg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={f.density_ppg}
                  onChange={(e) => update(i, { density_ppg: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>PV (cP)</Label>
                <Input
                  type="number"
                  step="1"
                  value={f.pv_cp ?? 0}
                  onChange={(e) => update(i, { pv_cp: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>YP (lbf/100ft²)</Label>
                <Input
                  type="number"
                  step="1"
                  value={f.yp_lbf100ft2 ?? 0}
                  onChange={(e) => update(i, { yp_lbf100ft2: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center md:justify-end">
                <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function FluidsEditor({
  value,
  onChange = () => {},
}: {
  value: FluidProgram
  onChange?: (next: FluidProgram) => void
}) {
  const updateMud = (patch: Partial<FluidSpec>) => onChange({ ...value, mud: { ...value.mud, ...patch } })
  return (
    <div className="space-y-6">
      <div className="rounded-md border p-3 space-y-3">
        <div className="text-sm font-medium">Mud (base)</div>
        <div className="grid md:grid-cols-4 gap-3">
          <div className="space-y-1 md:col-span-2">
            <Label>Name</Label>
            <Input value={value.mud.name} onChange={(e) => updateMud({ name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Density (ppg)</Label>
            <Input
              type="number"
              step="0.1"
              value={value.mud.density_ppg}
              onChange={(e) => updateMud({ density_ppg: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label>PV (cP)</Label>
            <Input
              type="number"
              step="1"
              value={value.mud.pv_cp ?? 0}
              onChange={(e) => updateMud({ pv_cp: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label>YP (lbf/100ft²)</Label>
            <Input
              type="number"
              step="1"
              value={value.mud.yp_lbf100ft2 ?? 0}
              onChange={(e) => updateMud({ yp_lbf100ft2: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
      <FluidList
        title="Displacement fluids (max 3)"
        items={value.displacement}
        onChange={(items) => onChange({ ...value, displacement: items.slice(0, 3) })}
      />
      <FluidList
        title="Spacers (max 3)"
        items={value.spacers}
        onChange={(items) => onChange({ ...value, spacers: items.slice(0, 3) })}
      />
      <FluidList
        title="Cements (max 3)"
        items={value.cements}
        onChange={(items) => onChange({ ...value, cements: items.slice(0, 3) })}
      />
    </div>
  )
}
