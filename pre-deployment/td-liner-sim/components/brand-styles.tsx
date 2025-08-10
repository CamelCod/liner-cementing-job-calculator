"use client"

import { Fragment } from "react"

/**
Inject Untitled UI-like brand tokens and support dark mode by relying on shadcn/ui's dark class.
We map brand choices to --primary and --ring. Tailwind/Shadcn will use these tokens.
*/
export function BrandStyles() {
  return (
    <Fragment>
      <style
        dangerouslySetInnerHTML={{
          __html: `
      :root {
        --primary: 234 84% 56%;
        --primary-foreground: 0 0% 100%;
        --ring: 234 84% 56%;
      }

      html[data-brand="brand"] {
        --primary: 234 84% 56%;
        --primary-foreground: 0 0% 100%;
        --ring: 234 84% 56%;
      }
      html[data-brand="error"] {
        --primary: 0 72% 55%;
        --primary-foreground: 0 0% 100%;
        --ring: 0 72% 55%;
      }
      html[data-brand="warning"] {
        --primary: 38 92% 50%;
        --primary-foreground: 0 0% 10%;
        --ring: 38 92% 50%;
      }
      html[data-brand="success"] {
        --primary: 146 58% 39%;
        --primary-foreground: 0 0% 100%;
        --ring: 146 58% 39%;
      }
      html[data-brand="gray-neutral"] {
        --primary: 222 12% 30%;
        --primary-foreground: 0 0% 100%;
        --ring: 222 12% 30%;
      }
    `,
        }}
      />
    </Fragment>
  )
}
