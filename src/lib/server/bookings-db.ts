import "server-only"

import Database from "better-sqlite3"
import fs from "node:fs"
import path from "node:path"
import { calculateNights, getDestination, getHotel } from "@/lib/voyage-data"
import type { BookingRecord } from "@/lib/booking-types"

type CreateBookingInput = {
  hotelId: string
  destinationId: string
  startDate: string
  endDate: string
  adults: number
  children: number
}

export class ActiveBookingError extends Error {
  constructor() {
    super("An active booking already exists. Cancel it before creating another booking.")
    this.name = "ActiveBookingError"
  }
}

const dataDirectory = path.join(process.cwd(), ".data")
const databasePath = path.join(dataDirectory, "voyage.sqlite")
let database: Database.Database | null = null

function getDatabase() {
  if (database) return database

  fs.mkdirSync(dataDirectory, { recursive: true })
  database = new Database(databasePath)
  database.pragma("journal_mode = WAL")
  database.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT NOT NULL UNIQUE,
      hotel_id TEXT NOT NULL,
      hotel_name TEXT NOT NULL,
      hotel_image TEXT NOT NULL,
      destination_id TEXT NOT NULL,
      destination_name TEXT NOT NULL,
      destination_country TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      adults INTEGER NOT NULL,
      children INTEGER NOT NULL,
      nights INTEGER NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('confirmed', 'completed', 'cancelled')),
      created_at TEXT NOT NULL,
      cancelled_at TEXT
    );
  `)
  seedPastBookings(database)
  return database
}

function seedPastBookings(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM bookings").get() as { count: number }
  if (count.count > 0) return

  const insert = db.prepare(`
    INSERT INTO bookings (
      reference, hotel_id, hotel_name, hotel_image, destination_id, destination_name,
      destination_country, start_date, end_date, adults, children, nights, total,
      status, created_at, cancelled_at
    ) VALUES (@reference, @hotelId, @hotelName, @hotelImage, @destinationId, @destinationName,
      @destinationCountry, @startDate, @endDate, @adults, @children, @nights, @total,
      @status, @createdAt, @cancelledAt)
  `)

  const seed = db.transaction(() => {
    insert.run({
      reference: "VYG-208714",
      hotelId: "rome-house",
      hotelName: "Rome House",
      hotelImage: "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=800&h=540&fit=crop&auto=format",
      destinationId: "rome",
      destinationName: "Rome",
      destinationCountry: "Italy",
      startDate: "2025-05-12",
      endDate: "2025-05-18",
      adults: 2,
      children: 0,
      nights: 6,
      total: 1260,
      status: "completed",
      createdAt: "2025-04-01T10:00:00.000Z",
      cancelledAt: null,
    })
    insert.run({
      reference: "VYG-164092",
      hotelId: "kyoto-house",
      hotelName: "Kyoto House",
      hotelImage: "https://images.unsplash.com/photo-1665706896821-319040b81753?w=800&h=540&fit=crop&auto=format",
      destinationId: "kyoto",
      destinationName: "Kyoto",
      destinationCountry: "Japan",
      startDate: "2024-11-04",
      endDate: "2024-11-10",
      adults: 2,
      children: 0,
      nights: 6,
      total: 1485,
      status: "completed",
      createdAt: "2024-09-01T10:00:00.000Z",
      cancelledAt: null,
    })
  })
  seed()
}

function mapBooking(row: Record<string, unknown>): BookingRecord {
  return {
    reference: String(row.reference),
    hotelId: String(row.hotel_id),
    hotelName: String(row.hotel_name),
    hotelImage: String(row.hotel_image),
    destinationId: String(row.destination_id),
    destinationName: String(row.destination_name),
    destinationCountry: String(row.destination_country),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    adults: Number(row.adults),
    children: Number(row.children),
    nights: Number(row.nights),
    total: Number(row.total),
    status: row.status as BookingRecord["status"],
    createdAt: String(row.created_at),
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
  }
}

export function listBookings() {
  const rows = getDatabase().prepare("SELECT * FROM bookings ORDER BY datetime(created_at) DESC").all() as Record<string, unknown>[]
  return rows.map(mapBooking)
}

export function getActiveBooking() {
  const row = getDatabase().prepare("SELECT * FROM bookings WHERE status = 'confirmed' ORDER BY datetime(created_at) DESC LIMIT 1").get() as Record<string, unknown> | undefined
  return row ? mapBooking(row) : null
}

export function createBooking(input: CreateBookingInput) {
  const db = getDatabase()
  if (getActiveBooking()) throw new ActiveBookingError()

  const hotel = getHotel(input.hotelId)
  const destination = getDestination(input.destinationId)
  if (!hotel || !destination || hotel.destinationId !== input.destinationId) throw new Error("The selected stay is not valid for this destination.")

  const nights = calculateNights(input.startDate, input.endDate)
  if (nights <= 0 || input.adults < 1) throw new Error("The booking dates or traveler count are invalid.")

  const total = hotel.pricePerNight * nights + Math.round(hotel.pricePerNight * nights * 0.083)
  const createdAt = new Date().toISOString()
  const reference = `VYG-${String(Date.now()).slice(-6)}`
  db.prepare(`
    INSERT INTO bookings (
      reference, hotel_id, hotel_name, hotel_image, destination_id, destination_name,
      destination_country, start_date, end_date, adults, children, nights, total,
      status, created_at, cancelled_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, NULL)
  `).run(reference, hotel.id, hotel.name, hotel.image, destination.id, destination.name, destination.country, input.startDate, input.endDate, input.adults, input.children, nights, total, createdAt)

  return getActiveBooking()
}

export function cancelBooking(reference: string) {
  const db = getDatabase()
  const cancelledAt = new Date().toISOString()
  const result = db.prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE reference = ? AND status = 'confirmed'").run(cancelledAt, reference)
  if (result.changes === 0) return null
  const row = db.prepare("SELECT * FROM bookings WHERE reference = ?").get(reference) as Record<string, unknown>
  return mapBooking(row)
}
