import { expect, test, type Page } from "@playwright/test"

type ToolResponse = {
  content: Array<{ type: "text"; text: string }>
}

type ToolPayload = {
  ok?: boolean
  code?: string
  [key: string]: unknown
}

async function executeTool(
  page: Page,
  name: string,
  input: Record<string, unknown> = {},
) {
  return page.evaluate(
    async ({ name, input }) => {
      const context = document.modelContext
      if (!context?.getTools || !context.executeTool) {
        throw new Error("WebMCP is not available")
      }

      const tools = await context.getTools()
      const tool = tools.find((item) => item.name === name)
      if (!tool) throw new Error(`${name} was not registered`)

      const rawResult = await context.executeTool(tool, JSON.stringify(input))
      return (typeof rawResult === "string"
        ? JSON.parse(rawResult)
        : rawResult) as ToolResponse
    },
    { name, input },
  )
}

function readPayload(response: ToolResponse) {
  return JSON.parse(response.content[0].text) as ToolPayload
}

test.beforeEach(async ({ request }) => {
  const response = await request.get("/api/bookings")
  const payload = (await response.json()) as {
    activeBooking: { reference: string } | null
  }

  if (payload.activeBooking) {
    await request.post(`/api/bookings/${payload.activeBooking.reference}/cancel`)
  }
})

test("WebMCP completes a trip setup, booking, and cancellation flow", async ({
  page,
}) => {
  await page.goto("/plan")

  const toolNames = await page.evaluate(async () => {
    const context = document.modelContext
    if (!context?.getTools || !context.executeTool) return null
    return (await context.getTools()).map((tool) => tool.name)
  })

  if (!toolNames) {
    test.skip(true, "WebMCP is not enabled in this browser")
    return
  }

  expect(toolNames).toHaveLength(18)
  expect(toolNames).toContain("book_itinerary")
  expect(toolNames).toContain("cancel_booking")

  const destinationResult = readPayload(
    await executeTool(page, "set_destination", { destinationId: "seoul" }),
  )
  expect(destinationResult.ok).toBe(true)
  await expect(page.getByLabel("Destination")).toHaveValue(
    "Seoul, South Korea",
  )

  const datesResult = readPayload(
    await executeTool(page, "set_trip_dates", {
      startDate: "2026-09-19",
      endDate: "2026-09-26",
    }),
  )
  expect(datesResult).toMatchObject({
    ok: true,
    startDate: "2026-09-19",
    endDate: "2026-09-26",
    nights: 7,
  })
  await expect(
    page.getByRole("button", { name: "Check-in 19 September" }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Check-out 26 September" }),
  ).toBeVisible()

  const travelersResult = readPayload(
    await executeTool(page, "set_travelers", { adults: 2, children: 1 }),
  )
  expect(travelersResult).toMatchObject({ ok: true, adults: 2, children: 1 })

  const contextResult = readPayload(await executeTool(page, "get_trip_context"))
  expect(contextResult.trip).toMatchObject({
    destination: { id: "seoul" },
    dates: { startDate: "2026-09-19", endDate: "2026-09-26", nights: 7 },
    travelers: { adults: 2, children: 1 },
  })

  await page.getByRole("button", { name: "Find stays" }).click()
  await expect(page).toHaveURL(/\/stays$/)
  await expect(page.getByRole("heading", { name: "Stay in Seoul" })).toBeVisible()

  const staysResult = readPayload(await executeTool(page, "search_stays"))
  const stays = staysResult.stays as Array<{ id: string }>
  expect(stays).toHaveLength(3)

  const filterResult = readPayload(
    await executeTool(page, "filter_stays", { minRating: 5, maxRating: 5 }),
  )
  const filteredStays = filterResult.stays as Array<{ id: string; stars: number }>
  expect(filteredStays).toHaveLength(1)
  expect(filteredStays[0].stars).toBe(5)
  await expect(page.getByText("1 properties found")).toBeVisible()

  const itineraryResult = readPayload(
    await executeTool(page, "add_stay_to_itinerary", {
      hotelId: filteredStays[0].id,
    }),
  )
  expect(itineraryResult).toMatchObject({ ok: true })

  await page.getByRole("button", { name: "Add to itinerary" }).click()
  await expect(page).toHaveURL(/\/itinerary$/)
  await expect(page.getByRole("heading", { name: "Your Seoul" })).toBeVisible()

  const summaryResult = readPayload(
    await executeTool(page, "get_booking_summary"),
  )
  expect(summaryResult).toMatchObject({
    ok: true,
    requiresConfirmation: true,
  })

  const missingConfirmation = readPayload(
    await executeTool(page, "book_itinerary"),
  )
  expect(missingConfirmation).toMatchObject({
    ok: false,
    code: "CONFIRMATION_REQUIRED",
  })

  const bookingResult = readPayload(
    await executeTool(page, "book_itinerary", { confirmation: "confirmed" }),
  )
  expect(bookingResult.ok).toBe(true)
  const booking = bookingResult.booking as { reference: string }
  expect(booking.reference).toMatch(/^VYG-/)

  await page.getByRole("link", { name: "My Trips", exact: true }).first().click()
  await expect(page).toHaveURL(/\/trips$/)
  await expect(page.getByRole("heading", { name: "My Trips" })).toBeVisible()
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible()

  const tripsResult = readPayload(await executeTool(page, "get_my_trips"))
  expect(tripsResult.activeBooking).toMatchObject({
    reference: booking.reference,
    status: "confirmed",
  })

  const cancellationResult = readPayload(
    await executeTool(page, "cancel_booking", {
      bookingReference: booking.reference,
      confirmation: "confirmed",
    }),
  )
  expect(cancellationResult).toMatchObject({
    ok: true,
    booking: { reference: booking.reference, status: "cancelled" },
  })

  await expect(page.getByText("No booked itinerary yet.")).toBeVisible()
})
