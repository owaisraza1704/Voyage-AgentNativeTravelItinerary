import { describe, expect, it } from "vitest"
import {
  calculateNights,
  createDefaultStayFilters,
  filterAndSortHotels,
  getDestination,
  getHotel,
} from "./voyage-data"

describe("travel dates", () => {
  it("calculates nights for a normal stay", () => {
    expect(calculateNights("2026-09-12", "2026-09-18")).toBe(6)
  })

  it("calculates nights across a month boundary", () => {
    expect(calculateNights("2026-09-29", "2026-10-03")).toBe(4)
  })

  it("rejects an invalid or reversed range", () => {
    expect(calculateNights("2026-09-18", "2026-09-12")).toBe(0)
    expect(calculateNights("not-a-date", "2026-09-18")).toBe(0)
  })
})

describe("destinations and stays", () => {
  it("finds a destination and its stay data by stable ID", () => {
    expect(getDestination("seoul")?.country).toBe("South Korea")
    expect(getHotel("paris-house")).toBeUndefined()
    expect(getHotel("maison-lumiere")?.destinationId).toBe("paris")
  })

  it("returns all Paris stays with the default filters", () => {
    const results = filterAndSortHotels("paris", createDefaultStayFilters(), "recommended")

    expect(results).toHaveLength(5)
    expect(results.every((hotel) => hotel.destinationId === "paris")).toBe(true)
  })

  it("combines rating, price, location, amenity, and breakfast filters", () => {
    const results = filterAndSortHotels("paris", {
      ...createDefaultStayFilters(),
      minRating: 5,
      maxRating: 5,
      maxPrice: 250,
      location: "Near Eiffel Tower",
      amenities: ["Breakfast included"],
      breakfastOnly: true,
    }, "recommended")

    expect(results.map((hotel) => hotel.id)).toEqual(["maison-lumiere"])
  })

  it("returns no stays for another destination", () => {
    const results = filterAndSortHotels("does-not-exist", createDefaultStayFilters(), "recommended")

    expect(results).toEqual([])
  })
})

describe("stay sorting", () => {
  it("sorts by nightly price in ascending order", () => {
    const results = filterAndSortHotels("paris", createDefaultStayFilters(), "price-asc")

    expect(results.map((hotel) => hotel.pricePerNight)).toEqual([112, 168, 185, 240, 265])
  })

  it("sorts by rating and uses price as the tie-breaker", () => {
    const results = filterAndSortHotels("paris", createDefaultStayFilters(), "rating-desc")

    expect(results.slice(0, 2).map((hotel) => hotel.id)).toEqual(["maison-lumiere", "hotel-rivoli"])
    expect(results.at(-1)?.stars).toBe(3)
  })
})
