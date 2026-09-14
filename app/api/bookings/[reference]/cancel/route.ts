import { NextResponse } from "next/server"
import { cancelBooking } from "@/lib/server/bookings-db"

export const runtime = "nodejs"

export async function POST(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  const booking = cancelBooking(reference)
  if (!booking) return NextResponse.json({ message: "Active booking not found." }, { status: 404 })
  return NextResponse.json(booking)
}
