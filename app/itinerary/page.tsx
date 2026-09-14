"use client"

import Link from "next/link"
import { useVoyage } from "@/components/voyage-provider"
import { formatDateRange, formatPrice } from "@/lib/voyage-data"

export default function ItineraryPage() {
  const { state, destination, selectedHotel, nights, taxes, total, removeHotel } = useVoyage()
  const airport = `${destination?.name ?? "Destination"} International Airport`
  const hasExistingBooking = Boolean(state.bookedItinerary && state.bookingStatus !== "confirmed")

  return (
    <div className="min-h-screen pt-16">
      <div className="relative h-52 overflow-hidden"><img src={destination?.image ?? "https://images.unsplash.com/photo-1526821799652-2dc51675628e?w=1920&h=400&fit=crop&auto=format"} alt={destination?.name ?? "Destination"} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-charcoal/55" /><div className="absolute inset-0 mx-auto flex max-w-7xl flex-col justify-center px-6"><h1 className="font-serif text-4xl text-white">Your {destination?.name ?? "Journey"}</h1><p className="mt-2 tracking-wide text-white/65">{formatDateRange(state.startDate, state.endDate)} · {nights} nights · {state.adults} adults</p></div></div>

      <div className="mx-auto max-w-7xl px-6 py-14"><div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_320px]"><div><div className="relative"><div className="absolute bottom-8 left-[11px] top-8 w-px bg-sand" /><div className="space-y-10"><TimelineItem date={formatDateRange(state.startDate, state.startDate)} label="Arrival" detail={airport} /><TimelineItem date={formatDateRange(state.startDate, state.endDate)} label={selectedHotel?.name ?? "Choose a stay"} detail={selectedHotel ? `${selectedHotel.stars}★ · ${selectedHotel.location}` : "Your hotel will appear here"} active>{selectedHotel && <div className="mt-5 flex gap-5 border border-sand p-5"><img src={selectedHotel.image} alt={selectedHotel.name} className="h-20 w-24 flex-shrink-0 object-cover" /><div className="flex-1"><div className="mb-2 text-sm font-medium text-charcoal">{selectedHotel.name}</div><div className="mb-3 flex flex-wrap gap-1.5">{selectedHotel.amenities.slice(0, 3).map((amenity) => <span key={amenity} className="border border-sand px-2 py-0.5 text-[10px] text-taupe">{amenity}</span>)}</div><div className="font-serif text-xl text-charcoal">{formatPrice(selectedHotel.pricePerNight * nights)}</div><div className="text-xs text-taupe">{nights} nights × {formatPrice(selectedHotel.pricePerNight)}</div></div></div>}</TimelineItem><TimelineItem date={formatDateRange(state.endDate, state.endDate)} label="Departure" detail={airport} /></div></div></div><aside><div className="sticky top-24 border border-sand p-8"><h2 className="mb-8 font-serif text-2xl text-charcoal">Trip Summary</h2><div className="mb-8 space-y-4 text-sm"><SummaryRow label={`Hotel (${nights} nights)`} value={selectedHotel ? formatPrice(selectedHotel.pricePerNight * nights) : "—"} /><SummaryRow label="Taxes & fees" value={selectedHotel ? formatPrice(taxes) : "—"} /><div className="flex items-baseline justify-between border-t border-sand pt-4"><span className="text-sm font-medium text-charcoal">Total</span><span className="font-serif text-2xl text-charcoal">{selectedHotel ? formatPrice(total) : "—"}</span></div></div>{hasExistingBooking ? <div className="border border-gold/40 bg-gold/5 p-4 text-sm leading-relaxed text-charcoal"><p>You already have a confirmed itinerary. Cancel it from My Trips before booking another stay.</p><Link href="/trips" className="mt-3 inline-block font-medium underline underline-offset-4">Manage existing booking</Link></div> : selectedHotel && state.bookingStatus === "confirmed" ? <Link href="/trips" className="block w-full bg-charcoal py-4 text-center text-[13px] uppercase tracking-[0.15em] text-ivory transition-colors hover:bg-gold">View booked trip</Link> : selectedHotel ? <><Link href="/booking" className="mb-3 block w-full bg-charcoal py-4 text-center text-[13px] uppercase tracking-[0.15em] text-ivory transition-colors hover:bg-gold">Review booking</Link><button onClick={removeHotel} className="w-full border border-sand py-3.5 text-[13px] tracking-wide text-charcoal transition-colors hover:border-charcoal">Remove stay</button></> : <Link href="/stays" className="block w-full bg-charcoal py-4 text-center text-[13px] uppercase tracking-[0.15em] text-ivory transition-colors hover:bg-gold">Find a stay</Link>}</div></aside></div></div>
    </div>
  )
}

function TimelineItem({ date, label, detail, active, children }: { date: string; label: string; detail: string; active?: boolean; children?: React.ReactNode }) {
  return <div className="flex gap-7"><div className="z-10 flex-shrink-0 pt-1"><div className={`flex h-6 w-6 items-center justify-center border-2 ${active ? "border-charcoal bg-charcoal" : "border-sand bg-ivory"}`}>{active && <div className="h-2 w-2 bg-ivory" />}</div></div><div className="flex-1 pb-4"><div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-taupe">{date}</div><div className="mb-1 font-serif text-2xl text-charcoal">{label}</div><div className="text-sm text-taupe">{detail}</div>{children}</div></div>
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-taupe">{label}</span><span className="text-charcoal">{value}</span></div>
}
