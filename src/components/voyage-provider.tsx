"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  calculateNights,
  createDefaultStayFilters,
  getDestination,
  getHotel,
  type Hotel,
  type StayFilters,
  type StaySort,
} from "@/lib/voyage-data";
import type { BookingRecord } from "@/lib/booking-types";

export type TripState = {
  destinationId: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  selectedHotelId: string | null;
  bookingStatus: "draft" | "confirmed";
  bookingReference: string | null;
  bookedItinerary: BookingRecord | null;
  bookingHistory: BookingRecord[];
  filters: StayFilters;
  sortOption: StaySort;
};

type TripAction =
  | { type: "destination/set"; destinationId: string }
  | { type: "dates/set"; startDate: string; endDate: string }
  | { type: "travelers/set"; adults: number; children: number }
  | { type: "hotel/select"; hotelId: string }
  | { type: "hotel/remove" }
  | { type: "filters/update"; filters: Partial<StayFilters> }
  | { type: "filters/reset" }
  | { type: "sort/set"; sort: StaySort }
  | {
      type: "bookings/load";
      activeBooking: BookingRecord | null;
      bookings: BookingRecord[];
    }
  | { type: "booking/confirmed"; booking: BookingRecord }
  | { type: "booking/cancelled"; booking: BookingRecord };

const initialState: TripState = {
  destinationId: "paris",
  startDate: "2026-09-14",
  endDate: "2026-09-18",
  adults: 2,
  children: 0,
  selectedHotelId: null,
  bookingStatus: "draft",
  bookingReference: null,
  bookedItinerary: null,
  bookingHistory: [],
  filters: createDefaultStayFilters(),
  sortOption: "recommended",
};

function tripReducer(state: TripState, action: TripAction): TripState {
  switch (action.type) {
    case "destination/set":
      return {
        ...state,
        destinationId: action.destinationId,
        selectedHotelId: null,
        bookingStatus: "draft",
        bookingReference: null,
        filters: createDefaultStayFilters(),
        sortOption: "recommended",
      };
    case "dates/set":
      return {
        ...state,
        startDate: action.startDate,
        endDate: action.endDate,
        bookingStatus: "draft",
        bookingReference: null,
      };
    case "travelers/set":
      return {
        ...state,
        adults: action.adults,
        children: action.children,
        bookingStatus: "draft",
        bookingReference: null,
      };
    case "hotel/select":
      return {
        ...state,
        selectedHotelId: action.hotelId,
        bookingStatus: "draft",
        bookingReference: null,
      };
    case "hotel/remove":
      return {
        ...state,
        selectedHotelId: null,
        bookingStatus: "draft",
        bookingReference: null,
      };
    case "filters/update":
      return {
        ...state,
        filters: { ...state.filters, ...action.filters },
      };
    case "filters/reset":
      return {
        ...state,
        filters: createDefaultStayFilters(),
        sortOption: "recommended",
      };
    case "sort/set":
      return { ...state, sortOption: action.sort };
    case "bookings/load":
      return {
        ...state,
        bookingHistory: action.bookings,
        bookedItinerary: action.activeBooking,
        selectedHotelId: action.activeBooking?.hotelId ?? null,
        destinationId:
          action.activeBooking?.destinationId ?? state.destinationId,
        startDate: action.activeBooking?.startDate ?? state.startDate,
        endDate: action.activeBooking?.endDate ?? state.endDate,
        adults: action.activeBooking?.adults ?? state.adults,
        children: action.activeBooking?.children ?? state.children,
        bookingStatus: action.activeBooking ? "confirmed" : "draft",
        bookingReference: action.activeBooking?.reference ?? null,
      };
    case "booking/confirmed":
      return {
        ...state,
        selectedHotelId: action.booking.hotelId,
        destinationId: action.booking.destinationId,
        startDate: action.booking.startDate,
        endDate: action.booking.endDate,
        adults: action.booking.adults,
        children: action.booking.children,
        bookingStatus: "confirmed",
        bookingReference: action.booking.reference,
        bookedItinerary: action.booking,
        bookingHistory: [
          action.booking,
          ...state.bookingHistory.filter(
            (booking) => booking.reference !== action.booking.reference,
          ),
        ],
      };
    case "booking/cancelled":
      return {
        ...state,
        selectedHotelId: null,
        bookingStatus: "draft",
        bookingReference: null,
        bookedItinerary: null,
        bookingHistory: [
          action.booking,
          ...state.bookingHistory.filter(
            (booking) => booking.reference !== action.booking.reference,
          ),
        ],
      };
  }
}

export type VoyageContextValue = {
  state: TripState;
  destination: ReturnType<typeof getDestination>;
  selectedHotel: Hotel | undefined;
  nights: number;
  total: number;
  taxes: number;
  bookingError: string | null;
  bookingsLoading: boolean;
  setDestination: (destinationId: string) => void;
  setDates: (startDate: string, endDate: string) => void;
  setTravelers: (adults: number, children: number) => void;
  selectHotel: (hotelId: string) => void;
  removeHotel: () => void;
  confirmBooking: () => Promise<BookingRecord | null>;
  cancelBooking: () => Promise<BookingRecord | null>;
  setFilters: (filters: Partial<StayFilters>) => void;
  setSort: (sort: StaySort) => void;
  resetFilters: () => void;
};

const VoyageContext = createContext<VoyageContextValue | null>(null);

export function VoyageProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [state, dispatch] = useReducer(tripReducer, initialState);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const destination = getDestination(state.destinationId);
  const selectedHotel = state.selectedHotelId
    ? getHotel(state.selectedHotelId)
    : undefined;
  const nights = calculateNights(state.startDate, state.endDate);
  const stayTotal = selectedHotel ? selectedHotel.pricePerNight * nights : 0;
  const taxes = Math.round(stayTotal * 0.083);

  useEffect(() => {
    let disposed = false;
    fetch("/api/bookings")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load bookings.");
        return response.json();
      })
      .then(
        (payload: {
          activeBooking: BookingRecord | null;
          bookings: BookingRecord[];
        }) => {
          if (!disposed)
            dispatch({
              type: "bookings/load",
              activeBooking: payload.activeBooking,
              bookings: payload.bookings,
            });
        },
      )
      .catch((error: unknown) => {
        if (!disposed)
          setBookingError(
            error instanceof Error ? error.message : "Unable to load bookings.",
          );
      })
      .finally(() => {
        if (!disposed) setBookingsLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, []);

  const value = useMemo<VoyageContextValue>(
    () => ({
      state,
      destination,
      selectedHotel,
      nights,
      total: stayTotal + taxes,
      taxes,
      bookingError,
      bookingsLoading,
      setDestination: (destinationId) =>
        dispatch({ type: "destination/set", destinationId }),
      setDates: (startDate, endDate) =>
        dispatch({ type: "dates/set", startDate, endDate }),
      setTravelers: (adults, children) =>
        dispatch({ type: "travelers/set", adults, children }),
      selectHotel: (hotelId) => dispatch({ type: "hotel/select", hotelId }),
      removeHotel: () => dispatch({ type: "hotel/remove" }),
      setFilters: (filters) => dispatch({ type: "filters/update", filters }),
      setSort: (sort) => dispatch({ type: "sort/set", sort }),
      resetFilters: () => dispatch({ type: "filters/reset" }),
      confirmBooking: async () => {
        setBookingError(null);
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hotelId: state.selectedHotelId,
            destinationId: state.destinationId,
            startDate: state.startDate,
            endDate: state.endDate,
            adults: state.adults,
            children: state.children,
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          setBookingError(payload.message ?? "Unable to create booking.");
          return null;
        }
        dispatch({
          type: "booking/confirmed",
          booking: payload as BookingRecord,
        });
        return payload as BookingRecord;
      },
      cancelBooking: async () => {
        if (!state.bookedItinerary) return null;
        setBookingError(null);
        const response = await fetch(
          `/api/bookings/${state.bookedItinerary.reference}/cancel`,
          { method: "POST" },
        );
        const payload = await response.json();
        if (!response.ok) {
          setBookingError(payload.message ?? "Unable to cancel booking.");
          return null;
        }
        dispatch({
          type: "booking/cancelled",
          booking: payload as BookingRecord,
        });
        return payload as BookingRecord;
      },
    }),
    [
      bookingError,
      bookingsLoading,
      destination,
      nights,
      selectedHotel,
      state,
      stayTotal,
      taxes,
    ],
  );

  return (
    <VoyageContext.Provider value={value}>{children}</VoyageContext.Provider>
  );
}

export function useVoyage() {
  const context = useContext(VoyageContext);
  if (!context) throw new Error("useVoyage must be used inside VoyageProvider");
  return context;
}
