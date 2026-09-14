import { notFound } from "next/navigation"
import { getHotel } from "@/lib/voyage-data"
import { HotelDetails } from "@/components/hotel-details"

export default async function HotelDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hotel = getHotel(id)
  if (!hotel) notFound()
  return <HotelDetails hotel={hotel} />
}
