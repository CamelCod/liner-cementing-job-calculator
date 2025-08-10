"use client"

import type React from "react"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type Brand = "brand" | "error" | "warning" | "success" | "gray-neutral"

type Ctx = {
  brand: Brand
  setBrand: (b: Brand) => void
}

const BrandContext = createContext<Ctx | null>(null)

export function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error("useBrand must be used within BrandProvider")
  return ctx
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<Brand>(() => {
    if (typeof window === "undefined") return "brand"
    const stored = window.localStorage.getItem("td.brand") as Brand | null
    return stored ?? "brand"
  })

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-brand", brand)
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("td.brand", brand)
    }
  }, [brand])

  const value = useMemo(() => ({ brand, setBrand }), [brand])
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}
