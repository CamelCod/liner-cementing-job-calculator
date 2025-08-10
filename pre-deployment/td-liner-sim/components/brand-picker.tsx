"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBrand } from "./brand-provider"

export function BrandPicker() {
  const { brand, setBrand } = useBrand()
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Brand</span>
      <Select value={brand} onValueChange={(v) => setBrand(v as any)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Brand color" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="brand">brand</SelectItem>
          <SelectItem value="error">error</SelectItem>
          <SelectItem value="warning">warning</SelectItem>
          <SelectItem value="success">success</SelectItem>
          <SelectItem value="gray-neutral">gray-neutral</SelectItem>
        </SelectContent>
      </Select>
      <span
        aria-hidden
        className="h-4 w-4 rounded-full"
        style={{ backgroundColor: "hsl(var(--primary))", boxShadow: "0 0 0 2px hsl(var(--ring))/20%" } as any}
      />
    </div>
  )
}
