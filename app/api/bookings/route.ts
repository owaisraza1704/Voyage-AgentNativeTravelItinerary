import { NextResponse } from "next/server"
import { ActiveBookingError, createBooking, getActiveBooking, listBookings } from "@/lib/server/bookings-db"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ activeBooking: getActiveBooking(), bookings: listBookings() })
}

export async function POST(request: Request) {
  try {
    const booking = createBooking(await request.json())
    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    if (error instanceof ActiveBookingError) return NextResponse.json({ message: error.message }, { status: 409 })
    const message = error instanceof Error ? error.message : "Unable to create booking."
    return NextResponse.json({ message }, { status: 400 })
  }
}
