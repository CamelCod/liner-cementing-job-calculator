"use client"

import type { TextareaHTMLAttributes } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export function SurveyEditor({
  value = "",
  onChange = () => {},
  ...props
}: { value?: string; onChange?: (v: string) => void } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const download = () => {
    const blob = new Blob([value], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "survey.csv"
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="space-y-3">
      <Textarea
        className="min-h-[220px] font-mono"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        {...props}
      />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={download}>
          Download CSV
        </Button>
      </div>
    </div>
  )
}
