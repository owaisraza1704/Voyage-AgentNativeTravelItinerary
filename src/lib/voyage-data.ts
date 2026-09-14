export type Destination = {
  id: string;
  name: string;
  country: string;
  tagline: string;
  description: string;
  image: string;
};

export type Hotel = {
  id: string;
  destinationId: string;
  name: string;
  stars: number;
  location: string;
  description: string;
  amenities: string[];
  pricePerNight: number;
  image: string;
  detailImages: string[];
};

export type StaySort =
  | "recommended"
  | "price-asc"
  | "price-desc"
  | "rating-desc";

export type StayFilters = {
  minPrice: number;
  maxPrice: number;
  minRating: number;
  maxRating: number;
  location: string;
  amenities: string[];
  breakfastOnly: boolean;
};

export function createDefaultStayFilters(): StayFilters {
  return {
    minPrice: 0,
    maxPrice: 300,
    minRating: 3,
    maxRating: 5,
    location: "all",
    amenities: [],
    breakfastOnly: false,
  };
}

export const destinations: Destination[] = [
  {
    id: "paris",
    name: "Paris",
    country: "France",
    tagline: "City of Light",
    description:
      "The grand boulevards, intimate cafés, and quiet gardens of the City of Light.",
    image:
      "https://images.unsplash.com/photo-1679231926688-ef9cdab5ed2f?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    tagline: "Ancient meets future",
    description:
      "A city of neon nights, quiet temples, and endlessly considered details.",
    image:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    tagline: "Desert grandeur",
    description:
      "A luminous meeting point of desert landscapes, modern design, and warm seas.",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    tagline: "Timeless Japan",
    description:
      "Moss gardens, wooden machiya, and a slower rhythm shaped by the seasons.",
    image:
      "https://images.unsplash.com/photo-1665706896821-319040b81753?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "london",
    name: "London",
    country: "United Kingdom",
    tagline: "Royal character",
    description:
      "A layered city of old-world grandeur, new ideas, and neighbourhood character.",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    tagline: "Garden city",
    description:
      "Tropical gardens, brilliant food, and a strikingly contemporary skyline.",
    image:
      "https://images.unsplash.com/photo-1628221680019-f28a2716e727?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "rome",
    name: "Rome",
    country: "Italy",
    tagline: "Eternal beauty",
    description:
      "Ancient stones, late dinners, and a city that rewards wandering without a plan.",
    image:
      "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Türkiye",
    tagline: "Where worlds meet",
    description:
      "A city of ferries, domes, spice markets, and two continents joined by water.",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "new-york",
    name: "New York",
    country: "United States",
    tagline: "Always in motion",
    description:
      "A restless, generous city of neighbourhoods, galleries, and unforgettable meals.",
    image:
      "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "barcelona",
    name: "Barcelona",
    country: "Spain",
    tagline: "Mediterranean rhythm",
    description:
      "Modernist architecture, long lunches, and the blue edge of the Mediterranean.",
    image:
      "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "lisbon",
    name: "Lisbon",
    country: "Portugal",
    tagline: "Light on the hills",
    description:
      "Tile-lined streets, Atlantic air, and a warm city made for slow afternoons.",
    image:
      "https://images.unsplash.com/photo-1555881400-74d7acaacb023?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "cape-town",
    name: "Cape Town",
    country: "South Africa",
    tagline: "Between mountain and sea",
    description:
      "A dramatic coastline, vineyard roads, and Table Mountain above it all.",
    image:
      "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    tagline: "Island stillness",
    description:
      "Rice terraces, warm water, and a deep sense of craft in every detail.",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    tagline: "Canals and quiet corners",
    description:
      "Golden canal houses, world-class art, and an easy pace on two wheels.",
    image:
      "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "marrakech",
    name: "Marrakech",
    country: "Morocco",
    tagline: "A city of colour",
    description:
      "Rose-walled riads, fragrant courtyards, and the Atlas Mountains beyond.",
    image:
      "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "vienna",
    name: "Vienna",
    country: "Austria",
    tagline: "Elegant by nature",
    description:
      "Imperial architecture, coffeehouse rituals, and a city with a composed soul.",
    image:
      "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "sydney",
    name: "Sydney",
    country: "Australia",
    tagline: "Harbour light",
    description:
      "Brilliant coves, long coastal walks, and a city built around the water.",
    image:
      "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&h=800&fit=crop&auto=format",
  },
  {
    id: "seoul",
    name: "Seoul",
    country: "South Korea",
    tagline: "Bright and grounded",
    description:
      "Mountain paths, bold design, and a food culture that keeps the city awake.",
    image:
      "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=600&h=800&fit=crop&auto=format",
  },
];

const parisHotels: Hotel[] = [
  {
    id: "maison-lumiere",
    destinationId: "paris",
    name: "Maison Lumière",
    stars: 5,
    location: "Near Eiffel Tower",
    description:
      "A refined Parisian stay combining contemporary interiors with classic French character. Floor-to-ceiling windows frame views of the city's rooftops, while the intimate dining room draws on seasonal Île-de-France produce.",
    amenities: [
      "Breakfast included",
      "Spa & wellness",
      "24-hr room service",
      "Concierge",
      "Bar & lounge",
      "Free Wi-Fi",
    ],
    pricePerNight: 240,
    image:
      "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=800&h=540&fit=crop&auto=format",
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
    amenities: [
      "Breakfast included",
      "Bar & lounge",
      "Courtyard garden",
      "Bicycle hire",
      "Library",
      "Free Wi-Fi",
    ],
    pricePerNight: 185,
    image:
      "https://images.unsplash.com/photo-1602081115720-72e5b0a254b8?w=800&h=540&fit=crop&auto=format",
    detailImages: [
      "https://images.unsplash.com/photo-1602081115720-72e5b0a254b8?w=1400&h=700&fit=crop&auto=format",
    ],
  },
  {
    id: "hotel-rivoli",
    destinationId: "paris",
    name: "Hôtel Rivoli",
    stars: 5,
    location: "Central Paris",
    description:
      "Commanding views over the Tuileries Garden from a landmark address on Rue de Rivoli. The grand colonnaded façade conceals 68 meticulously appointed rooms and an award-winning rooftop restaurant.",
    amenities: [
      "Breakfast available",
      "Fine dining",
      "Fitness centre",
      "Valet parking",
      "Rooftop terrace",
      "Free Wi-Fi",
    ],
    pricePerNight: 265,
    image:
      "https://images.unsplash.com/photo-1655516433028-9e0e1599cf8b?w=800&h=540&fit=crop&auto=format",
    detailImages: [
      "https://images.unsplash.com/photo-1655516433028-9e0e1599cf8b?w=1400&h=700&fit=crop&auto=format",
    ],
  },
  {
    id: "rue-cler-rooms",
    destinationId: "paris",
    name: "Rue Cler Rooms",
    stars: 3,
    location: "Rue Cler",
    description:
      "A bright, welcoming base near one of Paris's favourite market streets, with simple rooms and an easy walk to the Seine.",
    amenities: [
      "Breakfast available",
      "Free Wi-Fi",
      "Market access",
      "Luggage storage",
    ],
    pricePerNight: 112,
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=540&fit=crop&auto=format",
    detailImages: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&h=700&fit=crop&auto=format",
    ],
  },
  {
    id: "montmartre-atelier",
    destinationId: "paris",
    name: "Montmartre Atelier",
    stars: 4,
    location: "Montmartre",
    description:
      "A characterful hillside hotel with a tucked-away courtyard, local art on the walls, and Sacré-Cœur a few streets away.",
    amenities: [
      "Breakfast included",
      "Courtyard garden",
      "Bar & lounge",
      "Free Wi-Fi",
    ],
    pricePerNight: 168,
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=540&fit=crop&auto=format",
    detailImages: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1400&h=700&fit=crop&auto=format",
    ],
  },
];

const generatedHotels: Hotel[] = destinations
  .filter((destination) => destination.id !== "paris")
  .flatMap((destination, index) => [
    {
      id: `${destination.id}-house`,
      destinationId: destination.id,
      name: `${destination.name} House`,
      stars: 3,
      location: `Central ${destination.name}`,
      description: `A relaxed, well-placed base for discovering ${destination.name}, with comfortable rooms and an easy local rhythm.`,
      amenities: [
        "Breakfast available",
        "Free Wi-Fi",
        "Luggage storage",
        "City access",
      ],
      pricePerNight: 92 + (index % 4) * 8,
      image: destination.image,
      detailImages: [destination.image],
    },
    {
      id: `${destination.id}-atelier`,
      destinationId: destination.id,
      name: `${destination.name} Atelier`,
      stars: 4,
      location: `Old Town ${destination.name}`,
      description: `A polished boutique stay in the heart of ${destination.name}, balancing local character with the comforts of a thoughtful modern hotel.`,
      amenities: [
        "Breakfast included",
        "Free Wi-Fi",
        "Fitness room",
        "Concierge",
      ],
      pricePerNight: 148 + (index % 4) * 12,
      image: destination.image,
      detailImages: [destination.image],
    },
    {
      id: `${destination.id}-grand`,
      destinationId: destination.id,
      name: `The Grand ${destination.name}`,
      stars: 5,
      location: `Central ${destination.name}`,
      description: `A full-service stay designed for lingering in ${destination.name}, with generous rooms, calm interiors, and a strong sense of place.`,
      amenities: [
        "Breakfast included",
        "Free Wi-Fi",
        "Concierge",
        "Wellness studio",
        "Rooftop lounge",
      ],
      pricePerNight: 208 + (index % 4) * 12,
      image: destination.image,
      detailImages: [destination.image],
    },
  ]);

export const hotels: Hotel[] = [...parisHotels, ...generatedHotels];

export function getDestination(id: string) {
  return destinations.find((destination) => destination.id === id);
}

export function getHotel(id: string) {
  return hotels.find((hotel) => hotel.id === id);
}

export function filterAndSortHotels(
  destinationId: string,
  filters: StayFilters,
  sort: StaySort,
) {
  return hotels
    .filter((hotel) => {
      if (hotel.destinationId !== destinationId) return false;
      if (hotel.stars < filters.minRating || hotel.stars > filters.maxRating)
        return false;
      if (
        hotel.pricePerNight < filters.minPrice ||
        hotel.pricePerNight > filters.maxPrice
      )
        return false;
      if (filters.location !== "all" && hotel.location !== filters.location)
        return false;
      if (
        filters.amenities.some((amenity) => !hotel.amenities.includes(amenity))
      )
        return false;
      if (
        filters.breakfastOnly &&
        !hotel.amenities.some((amenity) =>
          amenity.toLowerCase().includes("breakfast"),
        )
      )
        return false;
      return true;
    })
    .sort((first, second) => {
      if (sort === "price-asc")
        return first.pricePerNight - second.pricePerNight;
      if (sort === "price-desc")
        return second.pricePerNight - first.pricePerNight;
      if (sort === "rating-desc")
        return (
          second.stars - first.stars ||
          first.pricePerNight - second.pricePerNight
        );
      return 0;
    });
}

export function formatPrice(value: number) {
  return `€${value.toLocaleString()}`;
}

export function calculateNights(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function formatDateRange(startDate: string, endDate: string) {
  const format = (value: string) =>
    dateFromKey(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return `${format(startDate)} — ${format(endDate)}`;
}

function dateFromKey(value: string) {
  return new Date(`${value}T00:00:00Z`);
}
