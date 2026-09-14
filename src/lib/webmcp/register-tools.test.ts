import { describe, expect, it, vi } from "vitest"
import { getDestination, getHotel, createDefaultStayFilters } from "@/lib/voyage-data"
import type { VoyageContextValue } from "@/components/voyage-provider"
import type { BookingRecord } from "@/lib/booking-types"
import type { ModelContext, WebMcpResult, WebMcpTool } from "@/lib/webmcp/types"
import { registerVoyageTools } from "@/lib/webmcp/register-tools"

const booking: BookingRecord = {
  reference: "VYG-482913",
  hotelId: "maison-lumiere",
  hotelName: "Maison Lumière",
  hotelImage: "hotel.jpg",
  destinationId: "paris",
  destinationName: "Paris",
  destinationCountry: "France",
  startDate: "2026-09-12",
  endDate: "2026-09-18",
  adults: 2,
  children: 0,
  nights: 6,
  total: 1560,
  status: "confirmed",
  createdAt: "2026-08-01T10:00:00.000Z",
  cancelledAt: null,
}

function createTestApi() {
  let snapshot = createSnapshot()
  const registeredTools = new Map<string, WebMcpTool>()
  const modelContext: ModelContext = {
    registerTool: async (tool) => {
      registeredTools.set(tool.name, tool)
    },
  }

  const actions = {
    getSnapshot: () => snapshot,
    setDestination: vi.fn((destinationId: string) => {
      snapshot = { ...snapshot, state: { ...snapshot.state, destinationId }, destination: getDestination(destinationId) }
    }),
    setDates: vi.fn((startDate: string, endDate: string) => {
      snapshot = { ...snapshot, state: { ...snapshot.state, startDate, endDate }, nights: 6 }
    }),
    setTravelers: vi.fn((adults: number, children: number) => {
      snapshot = { ...snapshot, state: { ...snapshot.state, adults, children } }
    }),
    navigate: vi.fn(),
    selectHotel: vi.fn((hotelId: string) => {
      snapshot = { ...snapshot, state: { ...snapshot.state, selectedHotelId: hotelId }, selectedHotel: getHotel(hotelId) }
    }),
    removeHotel: vi.fn(() => {
      snapshot = { ...snapshot, state: { ...snapshot.state, selectedHotelId: null }, selectedHotel: undefined }
    }),
    setFilters: vi.fn((filters: Partial<typeof snapshot.state.filters>) => {
      snapshot = { ...snapshot, state: { ...snapshot.state, filters: { ...snapshot.state.filters, ...filters } } }
    }),
    setSort: vi.fn((sort: typeof snapshot.state.sortOption) => {
      snapshot = { ...snapshot, state: { ...snapshot.state, sortOption: sort } }
    }),
    confirmBooking: vi.fn(async () => booking),
    cancelBooking: vi.fn(async () => ({ ...booking, status: "cancelled" as const, cancelledAt: "2026-09-14T10:00:00.000Z" })),
  }

  return { actions, modelContext, registeredTools }
}

function createSnapshot(): VoyageContextValue {
  return {
    state: {
      destinationId: "paris",
      startDate: "2026-09-12",
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
    },
    destination: getDestination("paris"),
    selectedHotel: undefined,
    nights: 6,
    total: 0,
    taxes: 0,
    bookingError: null,
    bookingsLoading: false,
    setDestination: vi.fn(),
    setDates: vi.fn(),
    setTravelers: vi.fn(),
    selectHotel: vi.fn(),
    removeHotel: vi.fn(),
    confirmBooking: vi.fn(async () => null),
    cancelBooking: vi.fn(async () => null),
    setFilters: vi.fn(),
    setSort: vi.fn(),
    resetFilters: vi.fn(),
  }
}

async function setup() {
  const testApi = createTestApi()
  await registerVoyageTools(testApi.modelContext, testApi.actions, new AbortController().signal)
  return testApi
}

async function readTool(tool: WebMcpTool, input: unknown = {}) {
  const response = await tool.execute(input) as WebMcpResult
  return JSON.parse(response.content[0].text) as Record<string, any>
}

describe("Voyage WebMCP tools", () => {
  it("registers the complete travel tool set", async () => {
    const { registeredTools } = await setup()

    expect([...registeredTools.keys()]).toEqual([
      "get_trip_context",
      "search_destinations",
      "get_destination",
      "set_destination",
      "set_trip_dates",
      "set_travelers",
      "navigate_to",
      "search_stays",
      "get_stay",
      "filter_stays",
      "sort_stays",
      "add_stay_to_itinerary",
      "remove_stay_from_itinerary",
      "get_itinerary",
      "calculate_total",
      "get_booking_summary",
      "book_itinerary",
      "get_my_trips",
      "cancel_booking",
    ])
  })

  it("sets a valid destination and rejects an unknown one", async () => {
    const { actions, registeredTools } = await setup()
    const tool = registeredTools.get("set_destination")!

    expect((await readTool(tool, { destinationId: "seoul" })).ok).toBe(true)
    expect(actions.setDestination).toHaveBeenCalledWith("seoul")
    expect((await readTool(tool, { destinationId: "unknown" })).code).toBe("DESTINATION_NOT_FOUND")
  })

  it("rejects invalid dates before changing trip state", async () => {
    const { actions, registeredTools } = await setup()
    const tool = registeredTools.get("set_trip_dates")!

    const response = await readTool(tool, { startDate: "2026-09-18", endDate: "2026-09-12" })

    expect(response.code).toBe("INVALID_DATES")
    expect(actions.setDates).not.toHaveBeenCalled()
  })

  it("applies stay filters through shared actions", async () => {
    const { actions, registeredTools } = await setup()
    const tool = registeredTools.get("filter_stays")!

    const response = await readTool(tool, { minRating: 5, maxPrice: 250, breakfastIncluded: true })

    expect(actions.setFilters).toHaveBeenCalledWith({ minRating: 5, maxPrice: 250, breakfastOnly: true })
    expect(response.stays.map((stay: { id: string }) => stay.id)).toEqual(["maison-lumiere"])
  })

  it("navigates only to allowlisted Voyage pages", async () => {
    const { actions, registeredTools } = await setup()
    const tool = registeredTools.get("navigate_to")!

    expect(await readTool(tool, { page: "stays" })).toMatchObject({
      ok: true,
      page: "stays",
      path: "/stays",
    })
    expect(actions.navigate).toHaveBeenCalledWith("stays")
    expect((await readTool(tool, { page: "https://example.com" })).code).toBe("INVALID_PAGE")
  })

  it("adds a compatible stay to the itinerary", async () => {
    const { actions, registeredTools } = await setup()
    const tool = registeredTools.get("add_stay_to_itinerary")!

    const response = await readTool(tool, { hotelId: "maison-lumiere" })

    expect(actions.selectHotel).toHaveBeenCalledWith("maison-lumiere")
    expect(response.itinerary.selectedStay.id).toBe("maison-lumiere")
  })

  it("requires explicit confirmation before booking", async () => {
    const testApi = await setup()
    const snapshot = testApi.actions.getSnapshot()
    const hotel = getHotel("maison-lumiere")
    Object.assign(snapshot, { selectedHotel: hotel, state: { ...snapshot.state, selectedHotelId: "maison-lumiere" } })
    const tool = testApi.registeredTools.get("book_itinerary")!

    expect((await readTool(tool, {})).code).toBe("CONFIRMATION_REQUIRED")
    expect(testApi.actions.confirmBooking).not.toHaveBeenCalled()
    expect((await readTool(tool, { confirmation: "confirmed" })).booking.reference).toBe("VYG-482913")
    expect(testApi.actions.confirmBooking).toHaveBeenCalledOnce()
  })

  it("requires confirmation and the active reference before cancellation", async () => {
    const testApi = await setup()
    const snapshot = testApi.actions.getSnapshot()
    Object.assign(snapshot, { state: { ...snapshot.state, bookedItinerary: booking } })
    const tool = testApi.registeredTools.get("cancel_booking")!

    expect((await readTool(tool, { bookingReference: booking.reference })).code).toBe("CONFIRMATION_REQUIRED")
    expect((await readTool(tool, { bookingReference: "VYG-other", confirmation: "confirmed" })).code).toBe("ACTIVE_BOOKING_NOT_FOUND")
    expect((await readTool(tool, { bookingReference: booking.reference, confirmation: "confirmed" })).booking.status).toBe("cancelled")
    expect(testApi.actions.cancelBooking).toHaveBeenCalledOnce()
  })
})
