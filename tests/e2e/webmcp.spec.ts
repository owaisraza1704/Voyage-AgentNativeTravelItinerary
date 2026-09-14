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

  expect(toolNames).toHaveLength(19)
  expect(toolNames).toContain("book_itinerary")
  expect(toolNames).toContain("cancel_booking")
  expect(toolNames).toContain("navigate_to")

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

  const navigationResult = readPayload(
    await executeTool(page, "navigate_to", { page: "stays" }),
  )
  expect(navigationResult).toMatchObject({ ok: true, page: "stays", path: "/stays" })
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

test("the agent panel executes a WebMCP tool and updates the planner", async ({
  page,
}) => {
  await page.goto("/plan")

  const webmcpAvailable = await page.evaluate(
    () => Boolean(document.modelContext?.getTools && document.modelContext.executeTool),
  )
  if (!webmcpAvailable) {
    test.skip(true, "WebMCP is not enabled in this browser")
    return
  }

  let agentRequestCount = 0
  await page.route("**/api/agent", async (route) => {
    agentRequestCount += 1
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        message: agentRequestCount === 1
          ? {
              role: "assistant",
              content: null,
              tool_calls: [{
                id: "call_set_destination",
                type: "function",
                function: {
                  name: "set_destination",
                  arguments: JSON.stringify({ destinationId: "seoul" }),
                },
              }],
            }
          : { role: "assistant", content: "Seoul is ready for your trip." },
      }),
    })
  })

  await page.getByRole("button", { name: "Talk to Voyage" }).click()
  await expect(page.getByText("19 tools connected")).toBeVisible()
  await page.getByRole("button", { name: "Set my destination to Seoul." }).click()

  await expect(page.getByText("Seoul is ready for your trip.")).toBeVisible()
  await expect(page.getByLabel("Destination")).toHaveValue(
    "Seoul, South Korea",
  )

  await page.getByRole("button", { name: "Close assistant" }).click()
  await expect(page.getByRole("complementary", { name: "Voyage AI assistant" })).not.toBeVisible()
  await page.getByRole("button", { name: "Talk to Voyage" }).click()
  await expect(page.getByText("Seoul is ready for your trip.")).toBeVisible()

  await page.getByRole("button", { name: "Clear chat" }).click()
  await expect(page.getByText("Seoul is ready for your trip.")).not.toBeVisible()
  await expect(page.getByRole("button", { name: "Set my destination to Seoul." })).toBeVisible()
})

test("the agent requires explicit confirmation before booking", async ({
  page,
}) => {
  await page.goto("/plan")

  const webmcpAvailable = await page.evaluate(
    () => Boolean(document.modelContext?.getTools && document.modelContext.executeTool),
  )
  if (!webmcpAvailable) {
    test.skip(true, "WebMCP is not enabled in this browser")
    return
  }

  await executeTool(page, "add_stay_to_itinerary", { hotelId: "maison-lumiere" })
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))

  let agentRequestCount = 0
  await page.route("**/api/agent", async (route) => {
    agentRequestCount += 1
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        message: agentRequestCount === 1
          ? {
              role: "assistant",
              content: null,
              tool_calls: [{
                id: "call_booking_summary",
                type: "function",
                function: {
                  name: "get_booking_summary",
                  arguments: "{}",
                },
              }],
            }
          : { role: "assistant", content: "Review the booking summary before confirming." },
      }),
    })
  })

  await page.getByRole("button", { name: "Talk to Voyage" }).click()
  await expect(page.getByText("19 tools connected")).toBeVisible()
  await page.getByPlaceholder("Ask Voyage anything...").fill("Prepare my booking")
  await page.getByRole("button", { name: "Send" }).click()

  await expect(page.getByRole("region", { name: "Booking confirmation" })).toBeVisible()
  await expect(page.getByText("Maison Lumière")).toBeVisible()
  await expect(page.getByRole("button", { name: "Confirm booking" })).toBeVisible()
  await expect(page.getByText("Review the booking summary before confirming.")).toBeVisible()

  await page.getByRole("button", { name: "Confirm booking" }).click()
  await expect(page.getByText(/Your journey is confirmed/)).toBeVisible()
  await expect(page.getByRole("region", { name: "Booking confirmation" })).not.toBeVisible()
})

test("the agent requires explicit confirmation before cancellation", async ({
  page,
}) => {
  await page.goto("/plan")

  const webmcpAvailable = await page.evaluate(
    () => Boolean(document.modelContext?.getTools && document.modelContext.executeTool),
  )
  if (!webmcpAvailable) {
    test.skip(true, "WebMCP is not enabled in this browser")
    return
  }

  await executeTool(page, "add_stay_to_itinerary", { hotelId: "maison-lumiere" })
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
  const bookingResult = readPayload(
    await executeTool(page, "book_itinerary", { confirmation: "confirmed" }),
  )
  const booking = bookingResult.booking as { reference: string }

  let agentRequestCount = 0
  await page.route("**/api/agent", async (route) => {
    agentRequestCount += 1
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        message: agentRequestCount === 1
          ? {
              role: "assistant",
              content: null,
              tool_calls: [{
                id: "call_my_trips",
                type: "function",
                function: { name: "get_my_trips", arguments: "{}" },
              }],
            }
          : agentRequestCount === 2
            ? {
                role: "assistant",
                content: null,
                tool_calls: [{
                  id: "call_cancel_booking",
                  type: "function",
                  function: {
                    name: "cancel_booking",
                    arguments: JSON.stringify({ bookingReference: booking.reference }),
                  },
                }],
              }
            : { role: "assistant", content: "I can cancel **Maison Lumière** after your confirmation." },
      }),
    })
  })

  await page.getByRole("button", { name: "Talk to Voyage" }).click()
  await expect(page.getByText("19 tools connected")).toBeVisible()
  await page.getByPlaceholder("Ask Voyage anything...").fill("Cancel my current booking")
  await page.getByRole("button", { name: "Send" }).click()

  const cancellationCard = page.getByRole("region", { name: "Cancellation confirmation" })
  await expect(cancellationCard).toBeVisible()
  await expect(cancellationCard.getByText("Maison Lumière")).toBeVisible()
  await expect(cancellationCard.getByRole("button", { name: "Confirm cancellation" })).toBeVisible()
  await expect(page.getByText("I can cancel Maison Lumière after your confirmation.")).toBeVisible()
  await expect(page.getByText("**Maison Lumière**")).not.toBeVisible()

  await cancellationCard.getByRole("button", { name: "Confirm cancellation" }).click()
  await expect(page.getByText(/Your booking has been cancelled/)).toBeVisible()
  await expect(cancellationCard).not.toBeVisible()
})
