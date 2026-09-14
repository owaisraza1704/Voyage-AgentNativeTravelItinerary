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
      getSnapshot: () => voyageRef.current,
      setDestination: (destinationId) => voyageRef.current.setDestination(destinationId),
      setDates: (startDate, endDate) => voyageRef.current.setDates(startDate, endDate),
      setTravelers: (adults, children) => voyageRef.current.setTravelers(adults, children),
      selectHotel: (hotelId) => voyageRef.current.selectHotel(hotelId),
      removeHotel: () => voyageRef.current.removeHotel(),
      setFilters: (filters) => voyageRef.current.setFilters(filters),
      setSort: (sort) => voyageRef.current.setSort(sort),
      confirmBooking: () => voyageRef.current.confirmBooking(),
      cancelBooking: () => voyageRef.current.cancelBooking(),
    }, controller.signal).catch(() => {
      // The browser can reject registration when WebMCP is unavailable or disabled.
    })

    return () => controller.abort()
  }, [])

  return children
}
