"use client"

import { createContext, useContext, useMemo, useReducer } from "react"
import { calculateNights, getDestination, getHotel, type Hotel } from "@/lib/voyage-data"

type TripState = {
  destinationId: string
  startDate: string
  endDate: string
  adults: number
  children: number
  selectedHotelId: string | null
  bookingStatus: "draft" | "confirmed"
  bookingReference: string | null
}

type TripAction =
  | { type: "destination/set"; destinationId: string }
  | { type: "dates/set"; startDate: string; endDate: string }
  | { type: "travelers/set"; adults: number; children: number }
  | { type: "hotel/select"; hotelId: string }
  | { type: "hotel/remove" }
  | { type: "booking/confirm" }

const initialState: TripState = {
  destinationId: "paris",
  startDate: "2024-10-12",
  endDate: "2024-10-18",
  adults: 2,
  children: 0,
  selectedHotelId: null,
  bookingStatus: "draft",
  bookingReference: null,
}

function tripReducer(state: TripState, action: TripAction): TripState {
  switch (action.type) {
    case "destination/set":
      return { ...state, destinationId: action.destinationId, selectedHotelId: null, bookingStatus: "draft", bookingReference: null }
    case "dates/set":
      return { ...state, startDate: action.startDate, endDate: action.endDate, bookingStatus: "draft", bookingReference: null }
    case "travelers/set":
      return { ...state, adults: action.adults, children: action.children, bookingStatus: "draft", bookingReference: null }
    case "hotel/select":
      return { ...state, selectedHotelId: action.hotelId, bookingStatus: "draft", bookingReference: null }
    case "hotel/remove":
      return { ...state, selectedHotelId: null, bookingStatus: "draft", bookingReference: null }
    case "booking/confirm":
      return { ...state, bookingStatus: "confirmed", bookingReference: "VYG-482913" }
  }
}

type VoyageContextValue = {
  state: TripState
  destination: ReturnType<typeof getDestination>
  selectedHotel: Hotel | undefined
  nights: number
  total: number
  taxes: number
  setDestination: (destinationId: string) => void
  setDates: (startDate: string, endDate: string) => void
  setTravelers: (adults: number, children: number) => void
  selectHotel: (hotelId: string) => void
  removeHotel: () => void
  confirmBooking: () => void
}

const VoyageContext = createContext<VoyageContextValue | null>(null)

export function VoyageProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [state, dispatch] = useReducer(tripReducer, initialState)
  const destination = getDestination(state.destinationId)
  const selectedHotel = state.selectedHotelId ? getHotel(state.selectedHotelId) : undefined
  const nights = calculateNights(state.startDate, state.endDate)
  const stayTotal = selectedHotel ? selectedHotel.pricePerNight * nights : 0
  const taxes = Math.round(stayTotal * 0.083)

  const value = useMemo<VoyageContextValue>(
    () => ({
      state,
      destination,
      selectedHotel,
      nights,
      total: stayTotal + taxes,
      taxes,
      setDestination: (destinationId) => dispatch({ type: "destination/set", destinationId }),
      setDates: (startDate, endDate) => dispatch({ type: "dates/set", startDate, endDate }),
      setTravelers: (adults, children) => dispatch({ type: "travelers/set", adults, children }),
      selectHotel: (hotelId) => dispatch({ type: "hotel/select", hotelId }),
      removeHotel: () => dispatch({ type: "hotel/remove" }),
      confirmBooking: () => dispatch({ type: "booking/confirm" }),
    }),
    [destination, nights, selectedHotel, state, stayTotal, taxes],
  )

  return <VoyageContext.Provider value={value}>{children}</VoyageContext.Provider>
}

export function useVoyage() {
  const context = useContext(VoyageContext)
  if (!context) throw new Error("useVoyage must be used inside VoyageProvider")
  return context
}
