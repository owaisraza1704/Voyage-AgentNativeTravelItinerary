"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "@/components/icons"
import { useVoyage } from "@/components/voyage-provider"
import { filterAndSortHotels, formatDateRange, formatPrice, hotels, type StaySort } from "@/lib/voyage-data"

const MIN_PRICE = 0
const MAX_PRICE = 300
type OpenFilter = "price" | "rating" | "location" | "amenities" | "sort" | null

export default function StaysPage() {
  const router = useRouter()
  const { state, destination, nights, selectHotel, setFilters, setSort, resetFilters } = useVoyage()
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null)
  const { minRating, maxRating, minPrice, maxPrice, breakfastOnly, location: locationFilter, amenities: amenityFilters } = state.filters
  const sortOption = state.sortOption

  const locationOptions = useMemo(() => Array.from(new Set(hotels.filter((hotel) => hotel.destinationId === state.destinationId).map((hotel) => hotel.location))), [state.destinationId])
  const amenityOptions = useMemo(() => Array.from(new Set(hotels.filter((hotel) => hotel.destinationId === state.destinationId).flatMap((hotel) => hotel.amenities))).sort(), [state.destinationId])

  const results = useMemo(() => filterAndSortHotels(state.destinationId, state.filters, sortOption), [sortOption, state.destinationId, state.filters])

  const ratingLabel = minRating === maxRating ? `${minRating} star${minRating === 1 ? "" : "s"}` : `${minRating}–${maxRating} stars`
  const priceLabel = minPrice === MIN_PRICE ? `Under ${formatPrice(maxPrice)}/night` : `${formatPrice(minPrice)}–${formatPrice(maxPrice)}/night`
  const hasRatingFilter = minRating !== 3 || maxRating !== 5
  const hasPriceFilter = minPrice !== MIN_PRICE || maxPrice !== MAX_PRICE
  const hasLocationFilter = locationFilter !== "all"
  const hasAmenityFilter = amenityFilters.length > 0
  const hasSortFilter = sortOption !== "recommended"
  const hasActiveFilters = hasRatingFilter || hasPriceFilter || hasLocationFilter || hasAmenityFilter || hasSortFilter || breakfastOnly

  function addToItinerary(hotelId: string) {
    if (state.bookedItinerary) {
      router.push("/trips")
      return
    }
    selectHotel(hotelId)
    router.push("/itinerary")
  }

  function clearFilters() {
    resetFilters()
    setOpenFilter(null)
  }

  return (
    <div className="min-h-screen px-6 pb-20 pt-28">
      <div className="mx-auto max-w-7xl">
        <Link href="/plan" className="mb-8 flex items-center gap-2 text-sm text-taupe transition-colors hover:text-charcoal"><ArrowLeftIcon className="h-4 w-4" /> Back to planner</Link>
        <div className="mb-8"><h1 className="mb-2 font-serif text-5xl text-charcoal">Stay in {destination?.name}</h1><p className="text-taupe">{formatDateRange(state.startDate, state.endDate)} · {state.adults + state.children} guests · {nights} nights</p></div>

        <div className="mb-4 flex flex-wrap items-start gap-2.5">
          <div className="relative">
            <FilterButton label="Price" active={hasPriceFilter} onClick={() => setOpenFilter(openFilter === "price" ? null : "price")} />
            {openFilter === "price" && <PriceFilter minPrice={minPrice} maxPrice={maxPrice} onMinChange={(value) => setFilters({ minPrice: value })} onMaxChange={(value) => setFilters({ maxPrice: value })} />}
          </div>
          <div className="relative">
            <FilterButton label="Rating" active={hasRatingFilter} onClick={() => setOpenFilter(openFilter === "rating" ? null : "rating")} />
            {openFilter === "rating" && <RatingFilter minRating={minRating} maxRating={maxRating} onMinChange={(value) => setFilters({ minRating: value })} onMaxChange={(value) => setFilters({ maxRating: value })} />}
          </div>
          <div className="relative">
            <FilterButton label="Location" active={hasLocationFilter} onClick={() => setOpenFilter(openFilter === "location" ? null : "location")} />
            {openFilter === "location" && <LocationFilter value={locationFilter} options={locationOptions} onChange={(value) => { setFilters({ location: value }); setOpenFilter(null) }} />}
          </div>
          <div className="relative">
            <FilterButton label="Amenities" active={hasAmenityFilter} onClick={() => setOpenFilter(openFilter === "amenities" ? null : "amenities")} />
            {openFilter === "amenities" && <AmenitiesFilter options={amenityOptions} selected={amenityFilters} onChange={(amenities) => setFilters({ amenities })} />}
          </div>
          <FilterButton label="Breakfast" active={breakfastOnly} onClick={() => setFilters({ breakfastOnly: !breakfastOnly })} />
          <div className="relative">
            <FilterButton label={sortOption === "recommended" ? "Sort: Recommended" : `Sort: ${sortLabel(sortOption)}`} active={hasSortFilter} onClick={() => setOpenFilter(openFilter === "sort" ? null : "sort")} />
            {openFilter === "sort" && <SortFilter value={sortOption} onChange={(value) => { setSort(value); setOpenFilter(null) }} />}
          </div>
        </div>

        {hasActiveFilters && <div className="mb-9 flex flex-wrap items-center gap-2"><span className="text-[11px] tracking-wide text-taupe">Active:</span>{hasPriceFilter && <button onClick={() => setFilters({ minPrice: MIN_PRICE, maxPrice: MAX_PRICE })} className="bg-charcoal px-3 py-1 text-xs tracking-wide text-ivory transition-colors hover:bg-gold">{priceLabel} <span className="ml-1.5 opacity-50">×</span></button>}{hasRatingFilter && <button onClick={() => setFilters({ minRating: 3, maxRating: 5 })} className="bg-charcoal px-3 py-1 text-xs tracking-wide text-ivory transition-colors hover:bg-gold">{ratingLabel} <span className="ml-1.5 opacity-50">×</span></button>}{hasLocationFilter && <button onClick={() => setFilters({ location: "all" })} className="bg-charcoal px-3 py-1 text-xs tracking-wide text-ivory transition-colors hover:bg-gold">{locationFilter} <span className="ml-1.5 opacity-50">×</span></button>}{hasAmenityFilter && <button onClick={() => setFilters({ amenities: [] })} className="bg-charcoal px-3 py-1 text-xs tracking-wide text-ivory transition-colors hover:bg-gold">{amenityFilters.length} amenities <span className="ml-1.5 opacity-50">×</span></button>}{hasSortFilter && <button onClick={() => setSort("recommended")} className="bg-charcoal px-3 py-1 text-xs tracking-wide text-ivory transition-colors hover:bg-gold">{sortLabel(sortOption)} <span className="ml-1.5 opacity-50">×</span></button>}{breakfastOnly && <button onClick={() => setFilters({ breakfastOnly: false })} className="bg-charcoal px-3 py-1 text-xs tracking-wide text-ivory transition-colors hover:bg-gold">Breakfast <span className="ml-1.5 opacity-50">×</span></button>}<button onClick={clearFilters} className="ml-1 border border-sand px-3 py-1 text-xs tracking-wide text-taupe transition-colors hover:border-charcoal hover:text-charcoal">Reset filters</button></div>}

        <p className="mb-8 text-sm text-taupe">{results.length} properties found</p>
        {results.length > 0 ? <div className="space-y-5">{results.map((hotel, index) => <HotelCard key={hotel.id} hotel={hotel} nights={nights} index={index} onAdd={() => addToItinerary(hotel.id)} />)}</div> : <div className="border border-sand p-12 text-center"><h2 className="font-serif text-3xl">Nothing quite matched.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-taupe">Try widening the rating or price range and we’ll bring back more options.</p><button onClick={clearFilters} className="mt-7 border border-charcoal px-5 py-2.5 text-sm transition-colors hover:bg-charcoal hover:text-ivory">Clear filters</button></div>}
      </div>
    </div>
  )
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`border px-4 py-2 text-[13px] transition-colors ${active ? "border-charcoal bg-charcoal text-ivory" : "border-sand text-charcoal hover:border-charcoal"}`}>{label}</button>
}

function sortLabel(value: StaySort) {
  if (value === "price-asc") return "Price: Low to High"
  if (value === "price-desc") return "Price: High to Low"
  if (value === "rating-desc") return "Rating"
  return "Recommended"
}

function LocationFilter({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return <div className="absolute left-0 top-11 z-20 w-64 border border-sand bg-ivory p-4 shadow-xl"><p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-taupe">Location</p><div className="space-y-1">{["all", ...options].map((option) => <button key={option} onClick={() => onChange(option)} className={`block w-full px-3 py-2 text-left text-sm transition-colors ${value === option ? "bg-charcoal text-ivory" : "text-charcoal hover:bg-stone"}`}>{option === "all" ? "All locations" : option}</button>)}</div></div>
}

function AmenitiesFilter({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (value: string[]) => void }) {
  function toggle(amenity: string) {
    onChange(selected.includes(amenity) ? selected.filter((item) => item !== amenity) : [...selected, amenity])
  }

  return <div className="absolute left-0 top-11 z-20 w-72 border border-sand bg-ivory p-4 shadow-xl"><p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-taupe">Amenities</p><div className="max-h-64 space-y-1 overflow-y-auto">{options.map((amenity) => <button key={amenity} onClick={() => toggle(amenity)} className={`block w-full px-3 py-2 text-left text-sm transition-colors ${selected.includes(amenity) ? "bg-charcoal text-ivory" : "text-charcoal hover:bg-stone"}`}>{amenity}</button>)}</div><button onClick={() => onChange([])} className="mt-3 border-t border-sand pt-3 text-xs text-taupe underline-offset-4 hover:text-charcoal hover:underline">Clear amenities</button></div>
}

function SortFilter({ value, onChange }: { value: StaySort; onChange: (value: StaySort) => void }) {
  return <div className="absolute right-0 top-11 z-20 w-64 border border-sand bg-ivory p-4 shadow-xl"><p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-taupe">Sort stays by</p><div className="space-y-1">{(["recommended", "price-asc", "price-desc", "rating-desc"] as StaySort[]).map((option) => <button key={option} onClick={() => onChange(option)} className={`block w-full px-3 py-2 text-left text-sm transition-colors ${value === option ? "bg-charcoal text-ivory" : "text-charcoal hover:bg-stone"}`}>{sortLabel(option)}</button>)}</div></div>
}

function PriceFilter({ minPrice, maxPrice, onMinChange, onMaxChange }: { minPrice: number; maxPrice: number; onMinChange: (value: number) => void; onMaxChange: (value: number) => void }) {
  return <div className="absolute left-0 top-11 z-20 w-72 border border-sand bg-ivory p-5 shadow-xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-taupe">Nightly price</p><p className="mt-1 font-serif text-xl text-charcoal">{formatPrice(minPrice)} – {formatPrice(maxPrice)}</p></div><span className="text-xs text-taupe">EUR</span></div><RangeControl label="Minimum" value={minPrice} min={MIN_PRICE} max={maxPrice} onChange={onMinChange} /><RangeControl label="Maximum" value={maxPrice} min={minPrice} max={MAX_PRICE} onChange={onMaxChange} /><p className="mt-4 text-xs leading-relaxed text-taupe">Adjust the range to see stays within your nightly budget.</p></div>
}

function RangeControl({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="mb-4 block last:mb-0"><span className="mb-2 flex justify-between text-xs text-taupe"><span>{label}</span><span className="text-charcoal">{formatPrice(value)}</span></span><input type="range" min={min} max={max} step={5} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-charcoal" /></label>
}

function RatingFilter({ minRating, maxRating, onMinChange, onMaxChange }: { minRating: number; maxRating: number; onMinChange: (value: number) => void; onMaxChange: (value: number) => void }) {
  return <div className="absolute left-0 top-11 z-20 w-72 border border-sand bg-ivory p-5 shadow-xl"><div className="mb-5"><p className="text-[10px] uppercase tracking-[0.18em] text-taupe">Star rating range</p><p className="mt-1 font-serif text-xl text-charcoal">{minRating}–{maxRating} stars</p></div><div className="grid grid-cols-2 gap-3"><label className="text-xs text-taupe">From<select value={minRating} onChange={(event) => onMinChange(Math.min(Number(event.target.value), maxRating))} className="mt-2 w-full border border-sand bg-ivory px-3 py-2 text-sm text-charcoal outline-none"><option value="3">3 stars</option><option value="4">4 stars</option><option value="5">5 stars</option></select></label><label className="text-xs text-taupe">To<select value={maxRating} onChange={(event) => onMaxChange(Math.max(Number(event.target.value), minRating))} className="mt-2 w-full border border-sand bg-ivory px-3 py-2 text-sm text-charcoal outline-none"><option value="3">3 stars</option><option value="4">4 stars</option><option value="5">5 stars</option></select></label></div><p className="mt-4 text-xs leading-relaxed text-taupe">Choose the minimum and maximum rating to include.</p></div>
}

function HotelCard({ hotel, nights, index, onAdd }: { hotel: (typeof hotels)[number]; nights: number; index: number; onAdd: () => void }) {
  const total = hotel.pricePerNight * nights
  return <article className="group animate-fade-slide-in overflow-hidden border border-sand transition-all duration-300 hover:border-charcoal/25" style={{ animationDelay: `${index * 90}ms`, animationFillMode: "both" }}><div className="grid grid-cols-1 md:grid-cols-[300px_1fr]"><div className="min-h-[220px] overflow-hidden bg-stone"><img src={hotel.image} alt={hotel.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" /></div><div className="flex flex-col justify-between p-8"><div><div className="flex items-start justify-between"><div><h2 className="font-serif text-2xl text-charcoal">{hotel.name}</h2><div className="mt-1.5 flex items-center gap-3"><Stars count={hotel.stars} /><span className="text-sm text-taupe">{hotel.location}</span></div></div></div><p className="mt-4 mb-5 max-w-lg text-[14px] leading-relaxed text-taupe">{hotel.description}</p><div className="flex flex-wrap gap-2">{hotel.amenities.slice(0, 4).map((amenity) => <span key={amenity} className="border border-sand px-2.5 py-1 text-[11px] tracking-wide text-taupe">{amenity}</span>)}</div></div><div className="mt-8 flex items-end justify-between border-t border-sand pt-6"><div><div className="font-serif text-[1.75rem] leading-none text-charcoal">{formatPrice(hotel.pricePerNight)}<span className="ml-1 font-sans text-sm text-taupe">/night</span></div><div className="mt-1 text-xs text-taupe">{formatPrice(total)} total · {nights} nights</div></div><div className="flex items-center gap-3"><Link href={`/stays/${hotel.id}`} className="border border-charcoal px-5 py-2.5 text-[13px] tracking-wide text-charcoal transition-colors hover:bg-charcoal hover:text-ivory">View details</Link><button onClick={onAdd} className="bg-charcoal px-5 py-2.5 text-[13px] tracking-wide text-ivory transition-colors hover:bg-gold">Add to itinerary</button></div></div></div></div></article>
}

function Stars({ count }: { count: number }) {
  return <span className="text-sm"><span className="text-gold">{"★".repeat(count)}</span><span className="text-sand">{"★".repeat(5 - count)}</span></span>
}
