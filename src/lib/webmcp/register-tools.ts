import type { VoyageContextValue } from "@/components/voyage-provider"
import {
  calculateNights,
  destinations,
  filterAndSortHotels,
  getDestination,
  getHotel,
  type StayFilters,
  type StaySort,
} from "@/lib/voyage-data"
import type { ModelContext, WebMcpResult, WebMcpTool } from "@/lib/webmcp/types"

type VoyageToolApi = Pick<VoyageContextValue, "setDestination" | "setDates" | "setTravelers" | "selectHotel" | "removeHotel" | "setFilters" | "setSort" | "confirmBooking" | "cancelBooking"> & {
  getSnapshot: () => VoyageContextValue
}

function result(payload: Record<string, unknown>): WebMcpResult {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] }
}

function inputObject(input: unknown) {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {}
}

function inputString(input: Record<string, unknown>, key: string) {
  return typeof input[key] === "string" ? input[key] : undefined
}

function inputNumber(input: Record<string, unknown>, key: string) {
  return typeof input[key] === "number" && Number.isFinite(input[key]) ? input[key] : undefined
}

function inputStringArray(input: Record<string, unknown>, key: string) {
  return Array.isArray(input[key]) && input[key].every((value) => typeof value === "string") ? input[key] as string[] : undefined
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
}

function staySummary(hotel: NonNullable<ReturnType<typeof getHotel>>, nights: number) {
  const subtotal = hotel.pricePerNight * nights
  return {
    id: hotel.id,
    name: hotel.name,
    destinationId: hotel.destinationId,
    stars: hotel.stars,
    location: hotel.location,
    pricePerNight: hotel.pricePerNight,
    total: subtotal + Math.round(subtotal * 0.083),
    amenities: hotel.amenities,
  }
}

function tripSummary(snapshot: VoyageContextValue) {
  return {
    destination: snapshot.destination ? { id: snapshot.destination.id, name: snapshot.destination.name, country: snapshot.destination.country } : null,
    dates: { startDate: snapshot.state.startDate, endDate: snapshot.state.endDate, nights: snapshot.nights },
    travelers: { adults: snapshot.state.adults, children: snapshot.state.children },
    filters: snapshot.state.filters,
    sort: snapshot.state.sortOption,
    selectedStay: snapshot.selectedHotel ? staySummary(snapshot.selectedHotel, snapshot.nights) : null,
    total: snapshot.total,
    taxes: snapshot.taxes,
    activeBooking: snapshot.state.bookedItinerary,
  }
}

function stayResults(snapshot: VoyageContextValue, destinationId = snapshot.state.destinationId, filters = snapshot.state.filters, sort = snapshot.state.sortOption) {
  return filterAndSortHotels(destinationId, filters, sort).map((hotel) => staySummary(hotel, snapshot.nights))
}

function filterPatch(input: Record<string, unknown>): Partial<StayFilters> | null {
  const patch: Partial<StayFilters> = {}
  const minPrice = inputNumber(input, "minPrice")
  const maxPrice = inputNumber(input, "maxPrice")
  const minRating = inputNumber(input, "minRating")
  const maxRating = inputNumber(input, "maxRating")
  const location = inputString(input, "location")
  const amenities = inputStringArray(input, "amenities")
  const breakfastIncluded = input.breakfastIncluded

  if (input.minPrice !== undefined && minPrice === undefined) return null
  if (input.maxPrice !== undefined && maxPrice === undefined) return null
  if (input.minRating !== undefined && minRating === undefined) return null
  if (input.maxRating !== undefined && maxRating === undefined) return null
  if (input.location !== undefined && location === undefined) return null
  if (input.amenities !== undefined && amenities === undefined) return null
  if (input.breakfastIncluded !== undefined && typeof breakfastIncluded !== "boolean") return null

  if (minPrice !== undefined) patch.minPrice = minPrice
  if (maxPrice !== undefined) patch.maxPrice = maxPrice
  if (minRating !== undefined) patch.minRating = minRating
  if (maxRating !== undefined) patch.maxRating = maxRating
  if (location !== undefined) patch.location = location
  if (amenities !== undefined) patch.amenities = amenities
  if (typeof breakfastIncluded === "boolean") patch.breakfastOnly = breakfastIncluded
  return patch
}

export async function registerVoyageTools(modelContext: ModelContext, actions: VoyageToolApi, signal: AbortSignal) {
  const tools: WebMcpTool[] = [
    {
      name: "get_trip_context",
      description: "Read the current Voyage destination, dates, travelers, filters, selected stay, and booking.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => result({ ok: true, trip: tripSummary(actions.getSnapshot()) }),
    },
    {
      name: "search_destinations",
      description: "Find Voyage destinations by name, country, tagline, or description.",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
      execute: (rawInput) => {
        const query = inputString(inputObject(rawInput), "query")?.toLowerCase().trim()
        if (query === undefined) return result({ ok: false, code: "QUERY_REQUIRED", message: "A destination search query is required." })
        const matches = destinations.filter((destination) => `${destination.name} ${destination.country} ${destination.tagline} ${destination.description}`.toLowerCase().includes(query))
        return result({ ok: true, destinations: matches.map(({ id, name, country, tagline, description }) => ({ id, name, country, tagline, description })) })
      },
    },
    {
      name: "get_destination",
      description: "Get details for one Voyage destination.",
      inputSchema: { type: "object", properties: { destinationId: { type: "string" } }, required: ["destinationId"], additionalProperties: false },
      execute: (rawInput) => {
        const destinationId = inputString(inputObject(rawInput), "destinationId")
        const destination = destinationId ? getDestination(destinationId) : undefined
        return destination ? result({ ok: true, destination }) : result({ ok: false, code: "DESTINATION_NOT_FOUND", message: "That destination is not available in Voyage." })
      },
    },
    {
      name: "set_destination",
      description: "Set the destination for the current Voyage trip.",
      inputSchema: { type: "object", properties: { destinationId: { type: "string" } }, required: ["destinationId"], additionalProperties: false },
      execute: (rawInput) => {
        const destinationId = inputString(inputObject(rawInput), "destinationId")
        const destination = destinationId ? getDestination(destinationId) : undefined
        if (!destination) return result({ ok: false, code: "DESTINATION_NOT_FOUND", message: "That destination is not available in Voyage." })
        actions.setDestination(destination.id)
        return result({ ok: true, destination: { id: destination.id, name: destination.name, country: destination.country } })
      },
    },
    {
      name: "set_trip_dates",
      description: "Set valid ISO check-in and check-out dates for the current trip.",
      inputSchema: { type: "object", properties: { startDate: { type: "string" }, endDate: { type: "string" } }, required: ["startDate", "endDate"], additionalProperties: false },
      execute: (rawInput) => {
        const input = inputObject(rawInput)
        const startDate = inputString(input, "startDate")
        const endDate = inputString(input, "endDate")
        const nights = startDate && endDate ? calculateNights(startDate, endDate) : 0
        if (!startDate || !endDate || !isIsoDate(startDate) || !isIsoDate(endDate) || nights <= 0) return result({ ok: false, code: "INVALID_DATES", message: "Check-out must be after check-in and both dates must use YYYY-MM-DD format." })
        actions.setDates(startDate, endDate)
        return result({ ok: true, startDate, endDate, nights })
      },
    },
    {
      name: "set_travelers",
      description: "Set the number of adults and children for the current trip.",
      inputSchema: { type: "object", properties: { adults: { type: "number", minimum: 1 }, children: { type: "number", minimum: 0 } }, required: ["adults"], additionalProperties: false },
      execute: (rawInput) => {
        const input = inputObject(rawInput)
        const adults = inputNumber(input, "adults")
        const children = input.children === undefined ? 0 : inputNumber(input, "children")
        if (adults === undefined || children === undefined || !Number.isInteger(adults) || !Number.isInteger(children) || adults < 1 || children < 0) return result({ ok: false, code: "INVALID_TRAVELERS", message: "Travelers must include at least one adult and use whole numbers." })
        actions.setTravelers(adults, children)
        return result({ ok: true, adults, children })
      },
    },
    {
      name: "search_stays",
      description: "Search local stays for the current or supplied destination using current filters and sorting.",
      inputSchema: { type: "object", properties: { destinationId: { type: "string" } }, additionalProperties: false },
      execute: (rawInput) => {
        const destinationId = inputString(inputObject(rawInput), "destinationId") ?? actions.getSnapshot().state.destinationId
        if (!getDestination(destinationId)) return result({ ok: false, code: "DESTINATION_NOT_FOUND", message: "That destination is not available in Voyage." })
        const snapshot = actions.getSnapshot()
        return result({ ok: true, destinationId, nights: snapshot.nights, stays: stayResults(snapshot, destinationId) })
      },
    },
    {
      name: "get_stay",
      description: "Get full details and the calculated stay price for one hotel.",
      inputSchema: { type: "object", properties: { hotelId: { type: "string" } }, required: ["hotelId"], additionalProperties: false },
      execute: (rawInput) => {
        const hotelId = inputString(inputObject(rawInput), "hotelId")
        const hotel = hotelId ? getHotel(hotelId) : undefined
        if (!hotel) return result({ ok: false, code: "STAY_NOT_FOUND", message: "That stay is not available in Voyage." })
        const snapshot = actions.getSnapshot()
        return result({ ok: true, stay: { ...hotel, total: staySummary(hotel, snapshot.nights).total }, nights: snapshot.nights })
      },
    },
    {
      name: "filter_stays",
      description: "Apply price, rating, location, amenities, and breakfast filters to current stay results.",
      inputSchema: { type: "object", properties: { minPrice: { type: "number" }, maxPrice: { type: "number" }, minRating: { type: "number" }, maxRating: { type: "number" }, location: { type: "string" }, amenities: { type: "array", items: { type: "string" } }, breakfastIncluded: { type: "boolean" } }, additionalProperties: false },
      execute: (rawInput) => {
        const patch = filterPatch(inputObject(rawInput))
        if (!patch) return result({ ok: false, code: "INVALID_FILTERS", message: "Filter values have the wrong types." })
        const current = actions.getSnapshot()
        const nextFilters = { ...current.state.filters, ...patch }
        if (nextFilters.minPrice > nextFilters.maxPrice || nextFilters.minRating > nextFilters.maxRating) return result({ ok: false, code: "INVALID_FILTER_RANGE", message: "Minimum filter values cannot exceed maximum values." })
        actions.setFilters(patch)
        return result({ ok: true, filters: nextFilters, stays: stayResults(current, current.state.destinationId, nextFilters) })
      },
    },
    {
      name: "sort_stays",
      description: "Sort current stays by recommendation, price, or rating.",
      inputSchema: { type: "object", properties: { sort: { type: "string", enum: ["recommended", "price-asc", "price-desc", "rating-desc"] } }, required: ["sort"], additionalProperties: false },
      execute: (rawInput) => {
        const sort = inputString(inputObject(rawInput), "sort")
        if (!sort || !["recommended", "price-asc", "price-desc", "rating-desc"].includes(sort)) return result({ ok: false, code: "INVALID_SORT", message: "Use recommended, price-asc, price-desc, or rating-desc." })
        actions.setSort(sort as StaySort)
        const snapshot = actions.getSnapshot()
        return result({ ok: true, sort, stays: stayResults(snapshot, snapshot.state.destinationId, snapshot.state.filters, sort as StaySort) })
      },
    },
    {
      name: "add_stay_to_itinerary",
      description: "Add one stay to the current itinerary.",
      inputSchema: { type: "object", properties: { hotelId: { type: "string" } }, required: ["hotelId"], additionalProperties: false },
      execute: (rawInput) => {
        const hotelId = inputString(inputObject(rawInput), "hotelId")
        const snapshot = actions.getSnapshot()
        const hotel = hotelId ? getHotel(hotelId) : undefined
        if (snapshot.state.bookedItinerary) return result({ ok: false, code: "ACTIVE_BOOKING_EXISTS", message: "Cancel the existing booking before creating another itinerary." })
        if (!hotel) return result({ ok: false, code: "STAY_NOT_FOUND", message: "That stay is not available in Voyage." })
        if (hotel.destinationId !== snapshot.state.destinationId) return result({ ok: false, code: "DESTINATION_MISMATCH", message: "That stay belongs to a different destination." })
        actions.selectHotel(hotel.id)
        return result({ ok: true, itinerary: { ...tripSummary(snapshot), selectedStay: staySummary(hotel, snapshot.nights), total: staySummary(hotel, snapshot.nights).total } })
      },
    },
    {
      name: "remove_stay_from_itinerary",
      description: "Remove the selected stay from the unconfirmed itinerary.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => {
        if (actions.getSnapshot().state.bookedItinerary) return result({ ok: false, code: "ACTIVE_BOOKING_EXISTS", message: "The confirmed booking must be cancelled from My Trips." })
        actions.removeHotel()
        return result({ ok: true, itinerary: { ...tripSummary(actions.getSnapshot()), selectedStay: null, total: 0 } })
      },
    },
    {
      name: "get_itinerary",
      description: "Read the current itinerary and selected stay.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => result({ ok: true, itinerary: tripSummary(actions.getSnapshot()) }),
    },
    {
      name: "calculate_total",
      description: "Calculate the current selected stay total including taxes.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => {
        const snapshot = actions.getSnapshot()
        if (!snapshot.selectedHotel) return result({ ok: false, code: "NO_STAY_SELECTED", message: "Select a stay before calculating a total." })
        return result({ ok: true, currency: "EUR", nights: snapshot.nights, nightlyRate: snapshot.selectedHotel.pricePerNight, taxes: snapshot.taxes, total: snapshot.total })
      },
    },
    {
      name: "get_booking_summary",
      description: "Prepare the current itinerary for booking and report whether explicit confirmation is required.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => {
        const snapshot = actions.getSnapshot()
        if (!snapshot.selectedHotel) return result({ ok: false, code: "NO_STAY_SELECTED", message: "Select a stay before requesting a booking summary." })
        return result({ ok: true, summary: tripSummary(snapshot), requiresConfirmation: !snapshot.state.bookedItinerary })
      },
    },
    {
      name: "book_itinerary",
      description: "Book the current itinerary only after the user has explicitly confirmed the booking summary.",
      inputSchema: { type: "object", properties: { confirmation: { type: "string", enum: ["confirmed"] } }, required: ["confirmation"], additionalProperties: false },
      execute: async (rawInput) => {
        const snapshot = actions.getSnapshot()
        if (inputString(inputObject(rawInput), "confirmation") !== "confirmed") return result({ ok: false, code: "CONFIRMATION_REQUIRED", message: "The user must explicitly confirm the booking after reviewing the summary." })
        if (snapshot.state.bookedItinerary) return result({ ok: false, code: "ACTIVE_BOOKING_EXISTS", message: "Cancel the existing booking before creating another itinerary." })
        if (!snapshot.selectedHotel) return result({ ok: false, code: "NO_STAY_SELECTED", message: "Select a stay before booking." })
        const booking = await actions.confirmBooking()
        return booking ? result({ ok: true, booking }) : result({ ok: false, code: "BOOKING_FAILED", message: "Voyage could not create the booking." })
      },
    },
    {
      name: "get_my_trips",
      description: "List the active, completed, and cancelled Voyage bookings.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => {
        const snapshot = actions.getSnapshot()
        return result({ ok: true, activeBooking: snapshot.state.bookedItinerary, bookings: snapshot.state.bookingHistory })
      },
    },
    {
      name: "cancel_booking",
      description: "Cancel the active Voyage booking after explicit user confirmation.",
      inputSchema: { type: "object", properties: { bookingReference: { type: "string" }, confirmation: { type: "string", enum: ["confirmed"] } }, required: ["bookingReference", "confirmation"], additionalProperties: false },
      execute: async (rawInput) => {
        const input = inputObject(rawInput)
        const snapshot = actions.getSnapshot()
        if (inputString(input, "confirmation") !== "confirmed") return result({ ok: false, code: "CONFIRMATION_REQUIRED", message: "The user must explicitly confirm cancellation." })
        if (!snapshot.state.bookedItinerary || inputString(input, "bookingReference") !== snapshot.state.bookedItinerary.reference) return result({ ok: false, code: "ACTIVE_BOOKING_NOT_FOUND", message: "That booking is not the current active booking." })
        const booking = await actions.cancelBooking()
        return booking ? result({ ok: true, booking }) : result({ ok: false, code: "CANCELLATION_FAILED", message: "Voyage could not cancel the booking." })
      },
    },
  ]

  await Promise.all(tools.map((tool) => modelContext.registerTool(tool, { signal })))
}
