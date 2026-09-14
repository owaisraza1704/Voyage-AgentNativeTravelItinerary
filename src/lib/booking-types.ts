export type BookingStatus = "confirmed" | "completed" | "cancelled"

export type BookingRecord = {
  reference: string
  hotelId: string
  hotelName: string
  hotelImage: string
  destinationId: string
  destinationName: string
  destinationCountry: string
  startDate: string
  endDate: string
  adults: number
  children: number
  nights: number
  total: number
  status: BookingStatus
  createdAt: string
  cancelledAt: string | null
}
