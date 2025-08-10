"use client"

import { useId } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { FrictionSection } from "@/lib/td-model"
import { Trash2, Plus } from "lucide-react"

export function FrictionSectionsEditor({
  sections = [],
  onChange = () => {},
}: {
  sections?: FrictionSection[]
  onChange?: (next: FrictionSection[]) => void
}) {
  const add = () => {
    const last = sections[sections.length - 1]
    const fromMD = last ? last.toMD : 0
    const toMD = fromMD + 1000
    onChange([...(sections || []), { fromMD, toMD, mu: 0.24 }])
  }
  const update = (i: number, patch: Partial<FrictionSection>) => {
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }
  const remove = (i: number) => onChange(sections.filter((_, idx) => idx !== i))

  const headerId = useId()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium" id={headerId}>
          Friction sections μ by depth (optional)
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          <Plus className="w-4 h-4 mr-2" />
          Add section
        </Button>
      </div>
      <div className="rounded-md border divide-y">
        {sections.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">No sections. Using default μ for all depths.</div>
        ) : (
          sections.map((s, i) => (
            <div key={i} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] p-3">
              <div className="space-y-1">
                <Label htmlFor={`from-${i}`}>From MD (ft)</Label>
                <Input
                  id={`from-${i}`}
                  type="number"
                  step="10"
                  value={s.fromMD}
                  onChange={(e) => update(i, { fromMD: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`to-${i}`}>To MD (ft)</Label>
                <Input
                  id={`to-${i}`}
                  type="number"
                  step="10"
                  value={s.toMD}
                  onChange={(e) => update(i, { toMD: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`mu-${i}`}>μ</Label>
                <Input
                  id={`mu-${i}`}
                  type="number"
                  step="0.01"
                  min={0}
                  value={s.mu}
                  onChange={(e) => update(i, { mu: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-end">
                <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove section">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      <Separator />
      <p className="text-xs text-muted-foreground">
        Sections are inclusive. Depths not covered by a section use the default μ above.
      </p>
    </div>
  )
}
