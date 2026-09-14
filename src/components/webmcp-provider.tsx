"use client"

import { useEffect, useRef } from "react"
import { useVoyage } from "@/components/voyage-provider"
import { registerVoyageTools } from "@/lib/webmcp/register-tools"

export function WebMcpProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const voyage = useVoyage()
  const voyageRef = useRef(voyage)
  voyageRef.current = voyage

  useEffect(() => {
    const modelContext = document.modelContext
    if (!modelContext) return

    const controller = new AbortController()
    registerVoyageTools(modelContext, {
      setDestination: (destinationId) => voyageRef.current.setDestination(destinationId),
    }, controller.signal).catch(() => {
      // The browser can reject registration when WebMCP is unavailable or disabled.
    })

    return () => controller.abort()
  }, [])

  return children
}

