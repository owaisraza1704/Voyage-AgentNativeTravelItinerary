"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import { useVoyage } from "@/components/voyage-provider";
import { formatDateRange, formatPrice, getDestination, type Hotel } from "@/lib/voyage-data";

export function HotelDetails({ hotel }: { hotel: Hotel }) {
  const router = useRouter();
  const { nights, state, setDestination, selectHotel } = useVoyage();
  const hotelDestination = getDestination(hotel.destinationId);
  const [activeImage, setActiveImage] = useState(0);
  const total = hotel.pricePerNight * nights;

  function addToItinerary() {
    if (state.bookedItinerary) {
      router.push("/trips");
      return;
    }
    setDestination(hotel.destinationId);
    selectHotel(hotel.id);
    router.push("/itinerary");
  }

  return (
    <div className="min-h-screen pt-16">
      <div className="relative h-[55vh] overflow-hidden bg-stone">
        <img
          src={hotel.detailImages[activeImage] ?? hotel.image}
          alt={hotel.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/35 to-charcoal/10" />
        <Link
          href="/stays"
          className="absolute left-6 top-6 flex items-center gap-2 bg-charcoal/25 px-4 py-2 text-sm text-white/85 backdrop-blur-sm transition-colors hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Back to stays
        </Link>
        {hotel.detailImages.length > 1 && (
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {hotel.detailImages.map((image, index) => (
              <button
                key={image}
                onClick={() => setActiveImage(index)}
                aria-label={`View image ${index + 1}`}
                className={`h-1.5 rounded-full transition-all ${index === activeImage ? "w-8 bg-white" : "w-1.5 bg-white/45"}`}
              />
            ))}
          </div>
        )}
      </div>
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-8">
              <h1 className="mb-3 font-serif text-5xl text-charcoal">
                {hotel.name}
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-gold">{"★".repeat(hotel.stars)}</span>
                <span className="text-taupe">{hotelDestination?.name} · {hotel.location}</span>
              </div>
            </div>
            <blockquote className="mb-10 border-l-2 border-gold pl-6">
              <p className="font-serif text-xl italic leading-relaxed text-charcoal/80">
                {hotel.description}
              </p>
            </blockquote>
            <div className="mb-10">
              <h2 className="mb-5 font-serif text-xl text-charcoal">
                Amenities
              </h2>
              <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2">
                {hotel.amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-3 text-sm text-charcoal/80"
                  >
                    <div className="h-1 w-1 flex-shrink-0 bg-gold" />
                    {amenity}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 border-t border-sand pt-8 sm:grid-cols-2">
              {[
                ["Cancellation", "Free until 48h before arrival"],
                ["Check-in / out", "15:00 — 11:00"],
                ["Breakfast", "Continental, served 7–10am"],
                ["Location", `${hotelDestination?.name} · ${hotel.location}`],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-taupe">
                    {label}
                  </div>
                  <div className="text-sm text-charcoal">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <aside>
            <div className="sticky top-24 border border-sand p-8">
              <div>
                <span className="font-serif text-3xl text-charcoal">
                  {formatPrice(hotel.pricePerNight)}
                </span>
                <span className="ml-1 text-sm text-taupe">/night</span>
              </div>
              <p className="mb-8 text-xs text-taupe">
                {formatPrice(total)} total for {nights} nights
              </p>
              <div className="mb-8 space-y-3.5 border border-sand p-5 text-sm">
                <SummaryRow label="Dates" value={formatDateRange(state.startDate, state.endDate)} />
                <SummaryRow
                  label="Guests"
                  value={`${state.adults} adults${state.children ? `, ${state.children} children` : ""}`}
                />
                <SummaryRow label="Duration" value={`${nights} nights`} />
                <div className="flex items-baseline justify-between border-t border-sand pt-3.5">
                  <span className="font-medium text-charcoal">Total</span>
                  <span className="font-serif text-xl text-charcoal">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>
              <button
                onClick={addToItinerary}
                className="mb-3 w-full bg-charcoal py-4 text-[13px] uppercase tracking-[0.15em] text-ivory transition-colors hover:bg-gold"
              >
                Add to itinerary
              </button>
              <Link
                href="/stays"
                className="block w-full border border-sand py-3.5 text-center text-[13px] tracking-wide text-charcoal transition-colors hover:border-charcoal"
              >
                Back to stays
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-taupe">{label}</span>
      <span className="text-charcoal">{value}</span>
    </div>
  );
}
