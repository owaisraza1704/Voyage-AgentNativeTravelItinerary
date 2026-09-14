export type Destination = {
  id: string
  name: string
  country: string
  tagline: string
  description: string
  image: string
}

export type Hotel = {
  id: string
  destinationId: string
  name: string
  stars: number
  location: string
  description: string
  amenities: string[]
  pricePerNight: number
  image: string
  detailImages: string[]
}

export const destinations: Destination[] = [
  {
    id: "paris",
    name: "Paris",
    country: "France",
    tagline: "City of Light",
    description: "The grand boulevards, intimate cafés, and quiet gardens of the City of Light.",
    image: "https://images.unsplash.com/photo-1679231926688-ef9cdab5ed2f?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    tagline: "Ancient meets future",
    description: "A city of neon nights, quiet temples, and endlessly considered details.",
    image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    tagline: "Desert grandeur",
    description: "A luminous meeting point of desert landscapes, modern design, and warm seas.",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    tagline: "Timeless Japan",
    description: "Moss gardens, wooden machiya, and a slower rhythm shaped by the seasons.",
    image: "https://images.unsplash.com/photo-1665706896821-319040b81753?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "london",
    name: "London",
    country: "United Kingdom",
    tagline: "Royal character",
    description: "A layered city of old-world grandeur, new ideas, and neighbourhood character.",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    tagline: "Garden city",
    description: "Tropical gardens, brilliant food, and a strikingly contemporary skyline.",
    image: "https://images.unsplash.com/photo-1628221680019-f28a2716e727?w=600&h=800&fit=crop&auto=format",
  },
]

export const hotels: Hotel[] = [
  {
    id: "maison-lumiere",
    destinationId: "paris",
    name: "Maison Lumière",
    stars: 5,
    location: "Near Eiffel Tower",
    description:
      "A refined Parisian stay combining contemporary interiors with classic French character. Floor-to-ceiling windows frame views of the city's rooftops, while the intimate dining room draws on seasonal Île-de-France produce.",
    amenities: ["Breakfast included", "Spa & wellness", "24-hr room service", "Concierge", "Bar & lounge", "Free Wi-Fi"],
    pricePerNight: 240,
    image: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=800&h=540&fit=crop&auto=format",
    detailImages: [
      "https://images.unsplash.com/photo-1731336478850-6bce7235e320?w=1400&h=700&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=1400&h=700&fit=crop&auto=format",
    ],
  },
  {
    id: "le-marais",
    destinationId: "paris",
    name: "Le Marais House",
    stars: 4,
    location: "Le Marais",
    description:
      "An intimate boutique hotel set within a beautifully restored 18th-century hôtel particulier, steps from Place des Vosges. The preserved courtyard provides a rare haven of quiet in central Paris.",
    amenities: ["Breakfast included", "Bar & lounge", "Courtyard garden", "Bicycle hire", "Library", "Free Wi-Fi"],
    pricePerNight: 185,
    image: "https://images.unsplash.com/photo-1602081115720-72e5b0a254b8?w=800&h=540&fit=crop&auto=format",
    detailImages: ["https://images.unsplash.com/photo-1602081115720-72e5b0a254b8?w=1400&h=700&fit=crop&auto=format"],
  },
  {
    id: "hotel-rivoli",
    destinationId: "paris",
    name: "Hôtel Rivoli",
    stars: 5,
    location: "Central Paris",
    description:
      "Commanding views over the Tuileries Garden from a landmark address on Rue de Rivoli. The grand colonnaded façade conceals 68 meticulously appointed rooms and an award-winning rooftop restaurant.",
    amenities: ["Breakfast available", "Fine dining", "Fitness centre", "Valet parking", "Rooftop terrace", "Free Wi-Fi"],
    pricePerNight: 265,
    image: "https://images.unsplash.com/photo-1655516433028-9e0e1599cf8b?w=800&h=540&fit=crop&auto=format",
    detailImages: ["https://images.unsplash.com/photo-1655516433028-9e0e1599cf8b?w=1400&h=700&fit=crop&auto=format"],
  },
]

export function getDestination(id: string) {
  return destinations.find((destination) => destination.id === id)
}

export function getHotel(id: string) {
  return hotels.find((hotel) => hotel.id === id)
}

export function formatPrice(value: number) {
  return `€${value.toLocaleString()}`
}

export function calculateNights(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime()
  const end = new Date(`${endDate}T00:00:00Z`).getTime()
  return Math.max(0, Math.round((end - start) / 86_400_000))
}
