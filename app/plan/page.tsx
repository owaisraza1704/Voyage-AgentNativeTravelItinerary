"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { destinations, getDestination, calculateNights } from "@/lib/voyage-data"
import { useVoyage } from "@/components/voyage-provider"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
type SelectionStep = "check-in" | "check-out"

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function dateFromKey(value: string) {
  return new Date(`${value}T00:00:00Z`)
}

function formatDate(value: string | null) {
  if (!value) return "Select date"
  return dateFromKey(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
}

function calendarDays(date: Date) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const mondayOffset = firstWeekday === 0 ? 6 : firstWeekday - 1
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return [...Array.from({ length: mondayOffset }, () => null), ...Array.from({ length: lastDay }, (_, index) => dateKey(year, month, index + 1))]
}

export default function PlanPage() {
  const router = useRouter()
  const { state, nights: storedNights, setDestination, setDates, setTravelers } = useVoyage()
  const [destinationQuery, setDestinationQuery] = useState("Paris, France")
  const [viewDate, setViewDate] = useState(() => dateFromKey(state.startDate))
  const [draftStartDate, setDraftStartDate] = useState<string | null>(state.startDate)
  const [draftEndDate, setDraftEndDate] = useState<string | null>(state.endDate)
  const [selectionStep, setSelectionStep] = useState<SelectionStep>("check-in")
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  useEffect(() => {
    const destinationId = new URLSearchParams(window.location.search).get("destination")
    const destination = destinationId ? getDestination(destinationId) : undefined
    if (destination) {
      setDestination(destination.id)
      setDestinationQuery(`${destination.name}, ${destination.country}`)
    }
  }, [])

  const matchingDestinations = destinations.filter((destination) => `${destination.name}, ${destination.country}`.toLowerCase().includes(destinationQuery.toLowerCase()))
  const visibleDays = calendarDays(viewDate)
  const previewEnd = draftEndDate ?? (selectionStep === "check-out" ? hoveredDate : null)
  const previewNights = draftStartDate && previewEnd && previewEnd > draftStartDate ? calculateNights(draftStartDate, previewEnd) : storedNights

  function moveMonth(amount: number) {
    setViewDate((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + amount, 1)))
  }

  function chooseDate(value: string) {
    if (selectionStep === "check-in" || !draftStartDate) {
      setDraftStartDate(value)
      setDraftEndDate(null)
      setSelectionStep("check-out")
      return
    }

    if (value <= draftStartDate) {
      setDraftStartDate(value)
      if (draftEndDate && value < draftEndDate) {
        setDates(value, draftEndDate)
      }
      return
    }

    setDraftEndDate(value)
    setDates(draftStartDate, value)
    setSelectionStep("check-in")
  }

  function clearDates() {
    setDraftStartDate(null)
    setDraftEndDate(null)
    setSelectionStep("check-in")
  }

  const canContinue = Boolean(draftStartDate && draftEndDate && previewNights > 0)

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
            <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
              <label className="text-[11px] uppercase tracking-[0.18em] text-taupe">Travel dates</label>
              <button onClick={clearDates} className="text-xs text-taupe underline-offset-4 transition-colors hover:text-charcoal hover:underline">Clear dates</button>
            </div>

            <div className="mb-10 flex items-center">
              <button onClick={() => setSelectionStep("check-in")} className={`flex-1 text-left ${selectionStep === "check-in" ? "opacity-100" : "opacity-65"}`}><div className="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-taupe">Check-in</div><div className="font-serif text-2xl text-charcoal">{formatDate(draftStartDate)}</div></button>
              <div className="relative mx-5 hidden h-px flex-1 bg-sand sm:block"><span className="absolute inset-0 flex items-center justify-center"><span className="bg-ivory px-3 text-xs text-taupe">{previewNights} nights</span></span></div>
              <button onClick={() => setSelectionStep("check-out")} className={`flex-1 text-right ${selectionStep === "check-out" ? "opacity-100" : "opacity-65"}`}><div className="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-taupe">Check-out</div><div className="font-serif text-2xl text-charcoal">{formatDate(draftEndDate)}</div></button>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <button onClick={() => moveMonth(-1)} className="p-2 text-2xl leading-none text-taupe transition-colors hover:text-charcoal" aria-label="Previous month">‹</button>
              <span className="text-[12px] uppercase tracking-[0.18em] text-charcoal">{monthLabel(viewDate)}</span>
              <button onClick={() => moveMonth(1)} className="p-2 text-2xl leading-none text-taupe transition-colors hover:text-charcoal" aria-label="Next month">›</button>
            </div>

            <div className="grid grid-cols-7 text-center">
              {WEEKDAYS.map((day) => <div key={day} className="py-2 text-[10px] tracking-wide text-taupe">{day}</div>)}
              {visibleDays.map((value, index) => {
                if (!value) return <div key={`empty-${index}`} />
                const isStart = value === draftStartDate
                const isEnd = value === draftEndDate
                const rangeEnd = previewEnd ?? draftStartDate
                const isInRange = Boolean(draftStartDate && rangeEnd && value > draftStartDate && value < rangeEnd)
                return <button key={value} onClick={() => chooseDate(value)} onMouseEnter={() => setHoveredDate(value)} onMouseLeave={() => setHoveredDate(null)} className={`py-2 text-sm transition-colors ${isStart || isEnd ? "bg-charcoal text-ivory" : isInRange ? "bg-sand text-charcoal" : "text-charcoal/70 hover:bg-stone"}`}>{dateFromKey(value).getUTCDate()}</button>
              })}
            </div>
            <p className="mt-6 text-center text-xs text-taupe">{selectionStep === "check-in" ? "Choose a check-in date" : "Now choose your check-out date"}</p>
          </section>

          <section className="border border-sand p-8">
            <label className="mb-7 block text-[11px] uppercase tracking-[0.18em] text-taupe">Travelers</label>
            <div className="space-y-5"><TravelerRow label="Adults" detail="Age 13+" value={state.adults} minimum={1} onChange={(value) => setTravelers(value, state.children)} /><TravelerRow label="Children" detail="Age 2–12" value={state.children} minimum={0} onChange={(value) => setTravelers(state.adults, value)} /></div>
          </section>

          <button disabled={!canContinue} onClick={() => router.push("/stays")} className="w-full bg-charcoal py-4 text-[13px] uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-40">Find stays</button>
        </div>
      </div>
    </div>
  )
}

function TravelerRow({ label, detail, value, minimum, onChange }: { label: string; detail: string; value: number; minimum: number; onChange: (value: number) => void }) {
  return <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-charcoal">{label}</div><div className="mt-0.5 text-xs text-taupe">{detail}</div></div><div className="flex items-center gap-5"><button onClick={() => onChange(Math.max(minimum, value - 1))} className="flex h-8 w-8 items-center justify-center border border-sand text-lg leading-none text-taupe transition-colors hover:border-charcoal hover:text-charcoal">−</button><span className="w-4 text-center font-serif text-lg text-charcoal">{value}</span><button onClick={() => onChange(value + 1)} className="flex h-8 w-8 items-center justify-center border border-sand text-lg leading-none text-taupe transition-colors hover:border-charcoal hover:text-charcoal">+</button></div></div>
}
