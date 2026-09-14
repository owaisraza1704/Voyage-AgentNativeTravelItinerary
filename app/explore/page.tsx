import Link from "next/link"
import { destinations } from "@/lib/voyage-data"

export default function ExplorePage() {
  return (
    <div className="min-h-screen px-6 pb-24 pt-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-taupe">Explore the world</p>
          <h1 className="font-serif text-5xl leading-tight text-charcoal">Find somewhere<br />that feels like you.</h1>
          <p className="mt-5 text-base leading-relaxed text-taupe">Choose a destination to begin your journey. Your dates, travelers, and stays will follow in the planning flow.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {destinations.map((destination) => <Link key={destination.id} href={`/plan?destination=${destination.id}`} className="group relative aspect-[4/5] overflow-hidden bg-stone"><img src={destination.image} alt={`${destination.name}, ${destination.country}`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" /><div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/10 to-transparent" /><div className="absolute bottom-0 left-0 right-0 p-5"><p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/55">{destination.tagline}</p><h2 className="font-serif text-2xl text-white">{destination.name}</h2><p className="mt-1 text-xs tracking-wide text-white/60">{destination.country}</p></div></Link>)}
        </div>
      </div>
    </div>
  )
}
