"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PipeSpec } from "@/lib/td-model"

export function PipeSpecEditor({
  title,
  value,
  onChange = () => {},
}: {
  title: string
  value: PipeSpec
  onChange?: (next: PipeSpec) => void
}) {
  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <div className="space-y-1 col-span-2 md:col-span-1">
          <Label>Name</Label>
          <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>OD (in)</Label>
          <Input
            type="number"
            step="0.01"
            value={value.od_in}
            onChange={(e) => onChange({ ...value, od_in: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label>ID (in)</Label>
          <Input
            type="number"
            step="0.01"
            value={value.id_in}
            onChange={(e) => onChange({ ...value, id_in: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label>Weight (lb/ft)</Label>
          <Input
            type="number"
            step="0.01"
            value={value.weight_lbft}
            onChange={(e) => onChange({ ...value, weight_lbft: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  )
}
