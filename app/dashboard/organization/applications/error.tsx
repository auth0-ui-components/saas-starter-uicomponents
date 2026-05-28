"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function ApplicationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Applications]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {process.env.NODE_ENV === "development"
          ? error.message
          : "An error occurred while loading applications. Please try again."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
