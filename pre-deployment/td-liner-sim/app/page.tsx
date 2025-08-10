"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { ScenarioForm } from "@/components/scenario-form"
import { SurveyEditor } from "@/components/survey-editor"
import { ResultsCharts } from "@/components/results-charts"
import { Well3D } from "@/components/well-3d"
import {
  type Scenario,
  type SurveyPoint,
  computeScenarioResult,
  defaultScenario,
  parseSurveyCSV,
  SAMPLE_SURVEY_CSV,
} from "@/lib/td-model"
import { BrandProvider } from "@/components/brand-provider"
import { BrandStyles } from "@/components/brand-styles"
import { SiteHeader } from "@/components/site-header"

export default function Page() {
  const [surveyCSV, setSurveyCSV] = useState<string>(SAMPLE_SURVEY_CSV)
  const [targetDepth, setTargetDepth] = useState<number>(9500)
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { ...defaultScenario, name: "Base - No Rotation" },
    { ...defaultScenario, name: "Lube + Rotation", mu: 0.18, rotate: true },
  ])

  const survey: SurveyPoint[] = useMemo(() => {
    try {
      return parseSurveyCSV(surveyCSV)
    } catch {
      return []
    }
  }, [surveyCSV])

  const maxMD = useMemo(() => (survey.length ? Math.max(...survey.map((p) => p.md)) : 0), [survey])
  const minMD = useMemo(() => (survey.length ? Math.min(...survey.map((p) => p.md)) : 0), [survey])

  const results = useMemo(() => {
    if (!survey.length) return []
    return scenarios.map((s) => computeScenarioResult({ survey, scenario: s, targetMD: targetDepth }))
  }, [survey, scenarios, targetDepth])

  const addScenario = () =>
    setScenarios((prev) => [...prev, { ...defaultScenario, name: `Scenario ${prev.length + 1}` }])
  const updateScenario = (index: number, patch: Partial<Scenario>) =>
    setScenarios((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  const deleteScenario = (index: number) => setScenarios((prev) => prev.filter((_, i) => i !== index))

  return (
    <BrandProvider>
      <BrandStyles />
      <main className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        <header className="space-y-3">
          <SiteHeader
            title={"Torque & Drag Simulator — Liner Installation"}
            subtitle={"Define a survey and multiple scenarios with an Untitled UI look, now with dark/light themes."}
            repoUrl={"https://github.com/CamelCod/liner-cementing-job-calculator"}
          />
        </header>

        <Tabs defaultValue="survey" className="space-y-6">
          <TabsList>
            <TabsTrigger value="survey">Survey</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="three">3D</TabsTrigger>
          </TabsList>

          <TabsContent value="survey" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Well Survey</CardTitle>
                <CardDescription>{"Paste or edit CSV with columns: md,inc,azi (ft, degrees)."}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SurveyEditor value={surveyCSV} onChange={setSurveyCSV} />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="min-md">Min MD (ft)</Label>
                    <Input id="min-md" value={minMD || ""} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-md">Max MD (ft)</Label>
                    <Input id="max-md" value={maxMD || ""} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-md">Top of Liner MD (ft)</Label>
                    <Input
                      id="target-md"
                      type="number"
                      min={minMD || 0}
                      max={maxMD || undefined}
                      step="10"
                      value={targetDepth}
                      onChange={(e) => setTargetDepth(Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">Scenarios</h2>
              <Button onClick={addScenario}>
                <Plus className="w-4 h-4 mr-2" />
                Add scenario
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {scenarios.map((s, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      <CardDescription>Pipe, fluid, friction, and rotation settings</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteScenario(i)} aria-label="Delete scenario">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ScenarioForm scenario={s} onChange={(patch) => updateScenario(i, patch)} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Surface Set-down Required at Target MD</CardTitle>
                <CardDescription>
                  Surface force required to deliver the requested set-down weight at the top of liner, accounting for
                  buoyancy and friction.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-md border p-4",
                        r.converged ? "border-border" : "border-destructive/50 ring-1 ring-destructive/40",
                      )}
                    >
                      <div className="text-sm text-muted-foreground">{scenarios[i]?.name}</div>
                      <div className="text-2xl font-semibold">
                        {r.converged ? `${r.surfaceSetdown.toFixed(0)} lbf` : "No convergence"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Target MD: {r.targetMD.toFixed(0)} ft • Target set-down at liner top:{" "}
                        {r.targetSetdown.toFixed(0)} lbf
                      </div>
                      <Separator className="my-3" />
                      <div className="text-xs grid gap-1">
                        <div>Buoyancy factor: {r.buoyancyFactor.toFixed(3)}</div>
                        <div>Buoyed weight: {r.w_buoyed.toFixed(2)} lb/ft</div>
                        <div>Surface torque (if rotating): {r.surfaceTorque.toFixed(0)} ft·lbf</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <ResultsCharts results={results} />
          </TabsContent>
          <TabsContent value="three" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Well Path 3D</CardTitle>
                <CardDescription>
                  {"Interactive 3D view generated from the survey using the minimum curvature method."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Well3D survey={survey} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <footer className="text-xs text-muted-foreground">
          Notes: This tool uses a soft-string approximation with distributed friction. It is intended for engineering
          exploration. Validate with field data and your company\'s standards before operational use.
        </footer>
      </main>
    </BrandProvider>
  )
}
