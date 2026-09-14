export const voyagePagePaths = {
  planner: "/plan",
  stays: "/stays",
  itinerary: "/itinerary",
  trips: "/trips",
} as const

export type VoyagePage = keyof typeof voyagePagePaths
