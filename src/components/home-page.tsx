"use client"

import Link from "next/link"
import { destinations } from "@/lib/voyage-data"

export function HomePage() {
  return (
    <div>
      <section className="relative flex min-h-screen items-end bg-charcoal">
        <img src="https://images.unsplash.com/photo-1526821799652-2dc51675628e?w=1920&h=1200&fit=crop&auto=format" alt="Aerial view of Paris at golden hour" className="absolute inset-0 h-full w-full object-cover opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/10 via-transparent to-charcoal/60" />
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-24">
          <div className="max-w-2xl">
            <p className="mb-5 text-[11px] uppercase tracking-[0.25em] text-white/50">Plan your next journey</p>
            <h1 className="mb-7 font-serif text-[clamp(3rem,7vw,5.5rem)] leading-[1.08] text-white">Where will you<br />go next?</h1>
            <p className="mb-12 max-w-md text-lg leading-relaxed text-white/70">Plan your next journey with Voyage — or simply tell us where you want to go.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/plan" className="bg-ivory px-8 py-3.5 text-[13px] uppercase tracking-[0.12em] text-charcoal transition-colors hover:bg-gold hover:text-ivory">Start planning</Link>
              <button onClick={() => document.dispatchEvent(new CustomEvent("voyage:open-agent"))} className="flex items-center gap-2.5 border border-white/35 px-6 py-3.5 text-[13px] tracking-wide text-white backdrop-blur-sm transition-colors hover:bg-white/10">Talk to Voyage</button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 right-8 hidden flex-col items-center gap-2 opacity-40 sm:flex"><div className="h-12 w-px animate-pulse bg-white" /><span className="translate-y-4 rotate-90 text-[10px] uppercase tracking-[0.2em] text-white">Scroll</span></div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 flex items-end justify-between"><div><p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-taupe">Featured</p><h2 className="font-serif text-[clamp(2rem,4vw,3rem)] text-charcoal">Explore somewhere beautiful</h2></div><span className="hidden text-sm tracking-wide text-taupe md:block">{destinations.length} destinations</span></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {destinations.map((destination) => <Link key={destination.id} href={`/plan?destination=${destination.id}`} className="group relative aspect-[3/4] overflow-hidden bg-stone"><img src={destination.image} alt={`${destination.name}, ${destination.country}`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]" /><div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/10 to-transparent" /><div className="absolute bottom-0 left-0 right-0 p-4"><div className="font-serif text-[1.1rem] leading-tight text-white">{destination.name}</div><div className="mt-0.5 text-[11px] tracking-wide text-white/55">{destination.country}</div></div></Link>)}
        </div>
      </section>

      <section className="border-t border-sand bg-mist py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 md:grid-cols-3 md:gap-16">
          {[
            ["Curated destinations", "Every recommendation is shaped around a clear point of view, from iconic city stays to quieter corners worth finding."],
            ["Voice-first planning", "Tell Voyage what you want in plain language and watch it build a considered shortlist in moments."],
            ["Seamless booking", "From discovery to confirmation in minutes, with the full itinerary visible at every step."],
          ].map(([title, body]) => <div key={title}><div className="mb-7 h-px w-8 bg-gold" /><h3 className="mb-3 font-serif text-xl text-charcoal">{title}</h3><p className="text-sm leading-relaxed text-taupe">{body}</p></div>)}
        </div>
      </section>
    </div>
  )
}
