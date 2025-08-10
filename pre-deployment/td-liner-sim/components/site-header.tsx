"use client"

import Link from "next/link"
import { ThemeToggle } from "./theme-toggle"
import { BrandPicker } from "./brand-picker"
import { Button } from "@/components/ui/button"

export function SiteHeader({
  title = "Liner Cementing Job Calculator",
  subtitle = "Modern Untitled UI styling with light/dark themes.",
  repoUrl = "https://github.com/CamelCod/liner-cementing-job-calculator",
}: {
  title?: string
  subtitle?: string
  repoUrl?: string
}) {
  return (
    <div
      className="rounded-xl p-5 md:p-6 border shadow-sm"
      style={
        {
          background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.18) 100%)",
          backgroundColor: "hsl(var(--primary) / 0.06)",
        } as any
      }
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-black/30 backdrop-blur px-2 py-1 text-xs font-medium">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "hsl(var(--primary))" } as any}
            />
            Untitled UI Theme
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold">{title}</h1>
          <p className="text-sm md:text-base text-foreground/80">{subtitle}</p>
          <div className="pt-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={repoUrl} target="_blank" rel="noreferrer">
                View GitHub Repo
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BrandPicker />
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
