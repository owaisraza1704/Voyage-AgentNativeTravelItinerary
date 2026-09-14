"use client"

import Link from "next/link"
import { useVoyage } from "@/components/voyage-provider"
import { CheckIcon } from "@/components/icons"
import { formatPrice } from "@/lib/voyage-data"

export default function BookingPage() {
  const { state, selectedHotel, nights, total, confirmBooking } = useVoyage()

  if (state.bookingStatus === "confirmed") {
    return <Confirmation reference={state.bookingReference ?? "VYG-482913"} />
  }

  if (!selectedHotel) {
    return <div className="flex min-h-screen items-center justify-center px-6 pt-16"><div className="max-w-md text-center"><p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-taupe">Nothing to review</p><h1 className="font-serif text-4xl">Choose a stay first.</h1><p className="mt-4 text-sm leading-relaxed text-taupe">Your booking summary will appear here once you add a hotel to the itinerary.</p><Link href="/stays" className="mt-8 inline-block bg-charcoal px-6 py-3 text-sm text-ivory transition-colors hover:bg-gold">Browse stays</Link></div></div>
  }

  const confirm = () => confirmBooking()
  return <div className="min-h-screen px-6 pb-20 pt-32"><div className="mx-auto max-w-2xl"><div className="mb-12"><p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-taupe">Final step</p><h1 className="font-serif text-5xl text-charcoal">Review your booking</h1><p className="mt-4 text-sm leading-relaxed text-taupe">This is a simulated booking. No payment or real reservation will be made.</p></div><div className="border border-sand p-8"><div className="flex gap-5 border-b border-sand pb-7"><img src={selectedHotel.image} alt={selectedHotel.name} className="h-24 w-28 object-cover" /><div><h2 className="font-serif text-2xl text-charcoal">{selectedHotel.name}</h2><div className="mt-1 text-gold">{"★".repeat(selectedHotel.stars)}</div><p className="mt-1 text-sm text-taupe">Paris, France · {selectedHotel.location}</p></div></div><div className="space-y-4 py-7 text-sm"><SummaryRow label="Dates" value="12 Oct — 18 Oct" /><SummaryRow label="Guests" value={`${state.adults} adults${state.children ? `, ${state.children} children` : ""}`} /><SummaryRow label="Duration" value={`${nights} nights`} /><SummaryRow label="Stay" value={formatPrice(selectedHotel.pricePerNight * nights)} /><SummaryRow label="Taxes & fees" value={formatPrice(total - selectedHotel.pricePerNight * nights)} /><div className="flex items-baseline justify-between border-t border-sand pt-5"><span className="font-medium text-charcoal">Estimated total</span><span className="font-serif text-3xl text-charcoal">{formatPrice(total)}</span></div></div><div className="border-t border-sand pt-7"><p className="mb-4 text-sm leading-relaxed text-taupe">You’re about to book {selectedHotel.name} for {formatPrice(total)} for {nights} nights. Confirm to complete the simulated booking.</p><button onClick={confirm} className="w-full bg-charcoal py-4 text-[13px] uppercase tracking-[0.15em] text-ivory transition-colors hover:bg-gold">Confirm simulated booking</button></div></div></div></div>
}

function Confirmation({ reference }: { reference: string }) {
  const { state, selectedHotel, total } = useVoyage()
  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-20"><div className="absolute inset-0 bg-gradient-to-br from-mist via-ivory to-stone" /><div className="relative w-full max-w-md animate-confirm-reveal"><div className="mb-10 flex justify-center"><div className="flex h-14 w-14 items-center justify-center border border-gold"><CheckIcon className="h-5 w-5 text-gold" /></div></div><div className="mb-12 text-center"><h1 className="mb-4 font-serif text-[2.8rem] leading-[1.1] text-charcoal">Your journey<br />is confirmed.</h1><p className="text-sm tracking-wide text-taupe">Booking reference: <span className="font-medium text-charcoal">{reference}</span></p></div><div className="border border-sand bg-ivory p-7">{selectedHotel && <div className="mb-6 flex gap-5"><img src={selectedHotel.image} alt={selectedHotel.name} className="h-20 w-20 flex-shrink-0 object-cover" /><div><div className="font-serif text-xl text-charcoal">{selectedHotel.name}</div><div className="text-sm text-gold">{"★".repeat(selectedHotel.stars)}</div><div className="mt-1 text-sm text-taupe">Paris, France</div></div></div>}<div className="space-y-3 border-t border-sand pt-5 text-sm"><SummaryRow label="Dates" value="12 Oct — 18 Oct" /><SummaryRow label="Guests" value={`${state.adults} adults`} /><div className="flex items-baseline justify-between border-t border-sand pt-3"><span className="text-sm text-taupe">Total</span><span className="font-serif text-2xl text-charcoal">{formatPrice(total)}</span></div></div></div><div className="mt-8 flex gap-3"><Link href="/itinerary" className="flex-1 border border-charcoal py-3.5 text-center text-[13px] tracking-wide text-charcoal transition-colors hover:bg-charcoal hover:text-ivory">View itinerary</Link><Link href="/" className="flex-1 bg-charcoal py-3.5 text-center text-[13px] tracking-wide text-ivory transition-colors hover:bg-gold">Explore more</Link></div></div></div>
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-taupe">{label}</span><span className="text-charcoal">{value}</span></div>
}
