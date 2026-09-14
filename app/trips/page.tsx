"use client"

import Link from "next/link"
import { useState } from "react"
import { useVoyage } from "@/components/voyage-provider"
import { formatDateRange, formatPrice } from "@/lib/voyage-data"

export default function TripsPage() {
  const { state, bookingsLoading, bookingError, cancelBooking } = useVoyage()
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const booking = state.bookedItinerary
  const pastBookings = state.bookingHistory.filter((item) => item.status !== "confirmed")

  async function cancelCurrentBooking() {
    await cancelBooking()
    setShowCancelConfirmation(false)
  }

  return (
    <div className="min-h-screen px-6 pb-24 pt-32">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14"><p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-taupe">Your journeys</p><h1 className="font-serif text-5xl text-charcoal">My Trips</h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-taupe">Keep track of your confirmed itineraries and revisit the places you’ve already explored.</p></div>

        {bookingError && <div className="mb-8 border border-red-900/20 bg-red-50/40 p-4 text-sm text-red-900">{bookingError}</div>}

        <section className="mb-16"><div className="mb-6 flex items-baseline justify-between"><h2 className="font-serif text-3xl text-charcoal">Booked itinerary</h2>{booking && <span className="text-xs uppercase tracking-[0.16em] text-gold">Confirmed</span>}</div>{bookingsLoading ? <div className="border border-sand p-10 text-center text-sm text-taupe">Loading your bookings…</div> : booking ? <div className="overflow-hidden border border-sand"><div className="grid md:grid-cols-[280px_1fr]"><img src={booking.hotelImage} alt={booking.hotelName} className="h-full min-h-[240px] w-full object-cover" /><div className="p-8"><div className="mb-7 flex items-start justify-between gap-5"><div><p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-taupe">{booking.destinationName}, {booking.destinationCountry}</p><h3 className="font-serif text-3xl text-charcoal">{booking.hotelName}</h3></div><span className="border border-gold px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-gold">{booking.reference}</span></div><div className="grid grid-cols-2 gap-5 border-y border-sand py-5 text-sm"><div><p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-taupe">Dates</p><p className="text-charcoal">{formatDateRange(booking.startDate, booking.endDate)}</p></div><div><p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-taupe">Travelers</p><p className="text-charcoal">{booking.adults} adults{booking.children ? `, ${booking.children} children` : ""}</p></div></div><div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs text-taupe">{booking.nights} nights · Total</p><p className="font-serif text-2xl text-charcoal">{formatPrice(booking.total)}</p></div><div className="flex flex-wrap gap-3"><Link href="/itinerary" className="border border-charcoal px-5 py-2.5 text-sm text-charcoal transition-colors hover:bg-charcoal hover:text-ivory">View itinerary</Link><button onClick={() => setShowCancelConfirmation(true)} className="border border-red-900/30 px-5 py-2.5 text-sm text-red-900 transition-colors hover:bg-red-900 hover:text-ivory">Cancel booking</button></div></div>{showCancelConfirmation && <div className="mt-6 border border-red-900/20 bg-red-50/40 p-5"><p className="text-sm text-charcoal">Cancel this simulated booking? You’ll need to choose and confirm a new stay afterward.</p><div className="mt-4 flex gap-3"><button onClick={cancelCurrentBooking} className="bg-red-900 px-4 py-2 text-sm text-ivory transition-colors hover:bg-red-800">Yes, cancel booking</button><button onClick={() => setShowCancelConfirmation(false)} className="border border-sand px-4 py-2 text-sm text-charcoal transition-colors hover:border-charcoal">Keep booking</button></div></div>}</div></div></div> : <div className="border border-dashed border-sand p-10 text-center"><h3 className="font-serif text-2xl text-charcoal">No booked itinerary yet.</h3><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-taupe">Choose a destination, add a stay, and confirm your simulated booking to see it here.</p><Link href="/explore" className="mt-6 inline-block bg-charcoal px-6 py-3 text-sm text-ivory transition-colors hover:bg-gold">Explore destinations</Link></div>}</section>

        <section><h2 className="mb-6 font-serif text-3xl text-charcoal">Past bookings</h2>{pastBookings.length === 0 ? <p className="text-sm text-taupe">Your completed and cancelled bookings will appear here.</p> : <div className="space-y-4">{pastBookings.map((pastBooking) => <article key={pastBooking.reference} className="grid overflow-hidden border border-sand md:grid-cols-[160px_1fr]"><img src={pastBooking.hotelImage} alt={pastBooking.hotelName} className="h-full min-h-[150px] w-full object-cover" /><div className="flex items-center justify-between gap-6 p-6"><div><p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-taupe">{pastBooking.destinationName}</p><h3 className="font-serif text-2xl text-charcoal">{pastBooking.hotelName}</h3><p className="mt-1 text-sm text-taupe">{formatDateRange(pastBooking.startDate, pastBooking.endDate)}</p></div><div className="text-right"><p className={`text-[10px] uppercase tracking-[0.16em] ${pastBooking.status === "cancelled" ? "text-red-900" : "text-taupe"}`}>{pastBooking.status}</p><p className="mt-1 font-serif text-xl text-charcoal">{formatPrice(pastBooking.total)}</p><p className="mt-1 text-xs text-taupe">{pastBooking.reference}</p></div></div></article>)}</div>}</section>
      </div>
    </div>
  )
}
