"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "@/components/icons"
import { useVoyage } from "@/components/voyage-provider"
import { formatPrice, hotels } from "@/lib/voyage-data"

type Filter = "rating" | "price" | "breakfast"

export default function StaysPage() {
  const router = useRouter()
  const { state, destination, nights, selectHotel } = useVoyage()
  const [filters, setFilters] = useState<Filter[]>(["rating", "price", "breakfast"])

  const results = useMemo(() => hotels.filter((hotel) => {
    if (hotel.destinationId !== state.destinationId) return false
    if (filters.includes("rating") && hotel.stars < 5) return false
    if (filters.includes("price") && hotel.pricePerNight >= 250) return false
    if (filters.includes("breakfast") && !hotel.amenities.some((amenity) => amenity.toLowerCase().includes("breakfast"))) return false
    return true
  }), [filters, state.destinationId])

  function toggleFilter(filter: Filter) {
    setFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter])
  }

  function addToItinerary(hotelId: string) {
    selectHotel(hotelId)
    router.push("/itinerary")
  }

  return (
    <div className="min-h-screen px-6 pb-20 pt-28">
      <div className="mx-auto max-w-7xl">
        <Link href="/plan" className="mb-8 flex items-center gap-2 text-sm text-taupe transition-colors hover:text-charcoal"><ArrowLeftIcon className="h-4 w-4" /> Back to planner</Link>
        <div className="mb-8"><h1 className="mb-2 font-serif text-5xl text-charcoal">Stay in {destination?.name}</h1><p className="text-taupe">12 Oct — 18 Oct · {state.adults + state.children} guests · {nights} nights</p></div>

        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <FilterButton label="Price" active={filters.includes("price")} onClick={() => toggleFilter("price")} />
          <FilterButton label="Rating" active={filters.includes("rating")} onClick={() => toggleFilter("rating")} />
          <button className="border border-sand px-4 py-2 text-[13px] text-charcoal transition-colors hover:border-charcoal">Location</button>
          <button className="border border-sand px-4 py-2 text-[13px] text-charcoal transition-colors hover:border-charcoal">Amenities</button>
          <FilterButton label="Breakfast" active={filters.includes("breakfast")} onClick={() => toggleFilter("breakfast")} />
          <button className="border border-sand px-4 py-2 text-[13px] text-charcoal transition-colors hover:border-charcoal">Sort: Recommended</button>
        </div>

        <div className="mb-9 flex flex-wrap items-center gap-2"><span className="text-[11px] tracking-wide text-taupe">Active:</span>{filters.map((filter) => <button key={filter} onClick={() => toggleFilter(filter)} className="bg-charcoal px-3 py-1 text-xs tracking-wide text-ivory transition-colors hover:bg-gold">{filter === "rating" ? "★★★★★" : filter === "price" ? "Under €250/night" : "Breakfast"} <span className="ml-1.5 opacity-50">×</span></button>)}</div>

        <p className="mb-8 text-sm text-taupe">{results.length} properties found</p>
        {results.length > 0 ? <div className="space-y-5">{results.map((hotel, index) => <HotelCard key={hotel.id} hotel={hotel} nights={nights} index={index} onAdd={() => addToItinerary(hotel.id)} />)}</div> : <div className="border border-sand p-12 text-center"><h2 className="font-serif text-3xl">Nothing quite matched.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-taupe">Try relaxing one of the active filters and we’ll widen the shortlist.</p><button onClick={() => setFilters([])} className="mt-7 border border-charcoal px-5 py-2.5 text-sm transition-colors hover:bg-charcoal hover:text-ivory">Clear filters</button></div>}
      </div>
    </div>
  )
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`border px-4 py-2 text-[13px] transition-colors ${active ? "border-charcoal bg-charcoal text-ivory" : "border-sand text-charcoal hover:border-charcoal"}`}>{label}</button>
}

function HotelCard({ hotel, nights, index, onAdd }: { hotel: (typeof hotels)[number]; nights: number; index: number; onAdd: () => void }) {
  const total = hotel.pricePerNight * nights
  return <article className="group animate-fade-slide-in overflow-hidden border border-sand transition-all duration-300 hover:border-charcoal/25" style={{ animationDelay: `${index * 90}ms`, animationFillMode: "both" }}><div className="grid grid-cols-1 md:grid-cols-[300px_1fr]"><div className="min-h-[220px] overflow-hidden bg-stone"><img src={hotel.image} alt={hotel.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" /></div><div className="flex flex-col justify-between p-8"><div><div className="flex items-start justify-between"><div><h2 className="font-serif text-2xl text-charcoal">{hotel.name}</h2><div className="mt-1.5 flex items-center gap-3"><Stars count={hotel.stars} /><span className="text-sm text-taupe">{hotel.location}</span></div></div></div><p className="mt-4 mb-5 max-w-lg text-[14px] leading-relaxed text-taupe">{hotel.description}</p><div className="flex flex-wrap gap-2">{hotel.amenities.slice(0, 4).map((amenity) => <span key={amenity} className="border border-sand px-2.5 py-1 text-[11px] tracking-wide text-taupe">{amenity}</span>)}</div></div><div className="mt-8 flex items-end justify-between border-t border-sand pt-6"><div><div className="font-serif text-[1.75rem] leading-none text-charcoal">{formatPrice(hotel.pricePerNight)}<span className="ml-1 font-sans text-sm text-taupe">/night</span></div><div className="mt-1 text-xs text-taupe">{formatPrice(total)} total · {nights} nights</div></div><div className="flex items-center gap-3"><Link href={`/stays/${hotel.id}`} className="border border-charcoal px-5 py-2.5 text-[13px] tracking-wide text-charcoal transition-colors hover:bg-charcoal hover:text-ivory">View details</Link><button onClick={onAdd} className="bg-charcoal px-5 py-2.5 text-[13px] tracking-wide text-ivory transition-colors hover:bg-gold">Add to itinerary</button></div></div></div></div></article>
}

function Stars({ count }: { count: number }) {
  return <span className="text-sm"><span className="text-gold">{"★".repeat(count)}</span><span className="text-sand">{"★".repeat(5 - count)}</span></span>
}
