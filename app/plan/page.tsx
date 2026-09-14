"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { destinations, getDestination } from "@/lib/voyage-data"
import { useVoyage } from "@/components/voyage-provider"

const OCTOBER_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const CHECK_IN = 12
const CHECK_OUT = 18

export default function PlanPage() {
  const router = useRouter()
  const { state, setDestination, setTravelers } = useVoyage()
  const [destinationQuery, setDestinationQuery] = useState("Paris, France")
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  useEffect(() => {
    const destinationId = new URLSearchParams(window.location.search).get("destination")
    const destination = destinationId ? getDestination(destinationId) : undefined
    if (destination) {
      setDestination(destination.id)
      setDestinationQuery(`${destination.name}, ${destination.country}`)
    }
  }, [])

  const matchingDestinations = destinations.filter((destination) => `${destination.name}, ${destination.country}`.toLowerCase().includes(destinationQuery.toLowerCase()))
  const nights = CHECK_OUT - CHECK_IN

  return (
    <div className="min-h-screen px-6 pb-20 pt-28">
      <div className="mx-auto max-w-2xl">
        <div className="mb-14">
          <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-taupe">Step 1 of 2</p>
          <h1 className="font-serif text-5xl text-charcoal">Plan your journey</h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-taupe">Set the essentials and we’ll bring you a considered shortlist of places to stay.</p>
        </div>

        <div className="space-y-6">
          <section className="border border-sand p-8 transition-colors focus-within:border-charcoal">
            <label htmlFor="destination" className="mb-4 block text-[11px] uppercase tracking-[0.18em] text-taupe">Destination</label>
            <input id="destination" value={destinationQuery} onChange={(event) => setDestinationQuery(event.target.value)} className="w-full bg-transparent font-serif text-[2rem] text-charcoal outline-none placeholder:text-sand" placeholder="Where to?" />
            <div className="mt-4 flex flex-wrap gap-2">
              {matchingDestinations.slice(0, 3).map((destination) => <button key={destination.id} onClick={() => { setDestination(destination.id); setDestinationQuery(`${destination.name}, ${destination.country}`) }} className={`border px-3 py-2 text-xs transition-colors ${state.destinationId === destination.id ? "border-charcoal bg-charcoal text-ivory" : "border-sand text-taupe hover:border-charcoal hover:text-charcoal"}`}>{destination.name}, {destination.country}</button>)}
            </div>
            <p className="mt-4 text-xs tracking-wide text-taupe">Choose a destination to see its available stays.</p>
          </section>

          <section className="border border-sand p-8">
            <div className="mb-7 flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-[0.18em] text-taupe">Travel dates</label>
              <span className="text-xs text-taupe">October 2024</span>
            </div>

            <div className="mb-10 flex items-center">
              <div className="flex-1"><div className="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-taupe">Check-in</div><div className="font-serif text-2xl text-charcoal">12 October</div></div>
              <div className="relative mx-5 hidden h-px flex-1 bg-sand sm:block"><span className="absolute inset-0 flex items-center justify-center"><span className="bg-ivory px-3 text-xs text-taupe">{nights} nights</span></span></div>
              <div className="flex-1 text-right"><div className="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-taupe">Check-out</div><div className="font-serif text-2xl text-charcoal">18 October</div></div>
            </div>

            <div className="grid grid-cols-7 text-center">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="py-2 text-[10px] tracking-wide text-taupe">{day}</div>)}
              <div />
              {OCTOBER_DAYS.map((day) => {
                const isEdge = day === CHECK_IN || day === CHECK_OUT
                const isInRange = day > CHECK_IN && day < CHECK_OUT
                const isHoveredRange = hoveredDay !== null && day >= CHECK_IN && day <= hoveredDay
                return <button key={day} onMouseEnter={() => setHoveredDay(day)} onMouseLeave={() => setHoveredDay(null)} className={`py-2 text-sm transition-colors ${isEdge ? "bg-charcoal text-ivory" : isInRange || isHoveredRange ? "bg-sand text-charcoal" : "text-charcoal/70 hover:bg-stone"}`}>{day}</button>
              })}
            </div>
          </section>

          <section className="border border-sand p-8">
            <label className="mb-7 block text-[11px] uppercase tracking-[0.18em] text-taupe">Travelers</label>
            <div className="space-y-5">
              <TravelerRow label="Adults" detail="Age 13+" value={state.adults} minimum={1} onChange={(value) => setTravelers(value, state.children)} />
              <TravelerRow label="Children" detail="Age 2–12" value={state.children} minimum={0} onChange={(value) => setTravelers(state.adults, value)} />
            </div>
          </section>

          <button onClick={() => router.push("/stays")} className="w-full bg-charcoal py-4 text-[13px] uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-gold">Find stays</button>
        </div>
      </div>
    </div>
  )
}

function TravelerRow({ label, detail, value, minimum, onChange }: { label: string; detail: string; value: number; minimum: number; onChange: (value: number) => void }) {
  return <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-charcoal">{label}</div><div className="mt-0.5 text-xs text-taupe">{detail}</div></div><div className="flex items-center gap-5"><button onClick={() => onChange(Math.max(minimum, value - 1))} className="flex h-8 w-8 items-center justify-center border border-sand text-lg leading-none text-taupe transition-colors hover:border-charcoal hover:text-charcoal">−</button><span className="w-4 text-center font-serif text-lg text-charcoal">{value}</span><button onClick={() => onChange(value + 1)} className="flex h-8 w-8 items-center justify-center border border-sand text-lg leading-none text-taupe transition-colors hover:border-charcoal hover:text-charcoal">+</button></div></div>
}
