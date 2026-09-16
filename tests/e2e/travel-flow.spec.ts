import { expect, test } from "@playwright/test"

test.beforeEach(async ({ request }) => {
  const response = await request.get("/api/bookings")
  const payload = await response.json() as { activeBooking: { reference: string } | null }

  if (payload.activeBooking) {
    await request.post(`/api/bookings/${payload.activeBooking.reference}/cancel`)
  }
})

test("allows a traveler to choose a destination and dates", async ({ page }) => {
  await page.goto("/plan")

  await expect(page.getByRole("heading", { name: "Plan your journey" })).toBeVisible()

  const destination = page.getByLabel("Destination")
  await destination.fill("Seoul")
  await page.getByRole("button", { name: "Seoul, South Korea" }).click()
  await expect(destination).toHaveValue("Seoul, South Korea")

  await page.getByRole("button", { name: "19", exact: true }).click()
  await page.getByRole("button", { name: "26", exact: true }).click()
  await expect(page.getByRole("button", { name: "Check-in 19 September" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Check-out 26 September" })).toBeVisible()
})

test("connects the realtime microphone session and receives transcript events", async ({ page }) => {
  await page.addInitScript(() => {
    const tracks = [{ stop() {} }]
    const tripContextTool = {
      name: "get_trip_context",
      description: "Read the current Voyage trip.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }
    ;(globalThis as Record<string, unknown>).__voyageSentEvents = []
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        getTools: async () => [tripContextTool],
        executeTool: async () => ({
          content: [{ type: "text", text: JSON.stringify({ ok: true, trip: {} }) }],
        }),
      },
    })
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => tracks }) },
    })

    class MockDataChannel {
      readyState = "connecting"
      onopen: (() => void) | null = null
      onmessage: ((event: { data: string }) => void) | null = null
      onerror: (() => void) | null = null

      constructor() {
        ;(globalThis as Record<string, unknown>).__voyageDataChannel = this
      }

      open() {
        this.readyState = "open"
        this.onopen?.()
      }

      send(value: string) {
        ;(globalThis as Record<string, unknown[]>).__voyageSentEvents.push(JSON.parse(value))
      }
      close() { this.readyState = "closed" }
      emit(event: Record<string, unknown>) {
        this.onmessage?.({ data: JSON.stringify(event) })
      }
    }

    class MockPeerConnection {
      connectionState = "new"
      localDescription: { type: "offer"; sdp: string } | null = null
      ontrack: ((event: { streams: MediaStream[]; track: MediaStreamTrack }) => void) | null = null
      onconnectionstatechange: (() => void) | null = null
      dataChannel: MockDataChannel | null = null

      addTrack() {}
      createDataChannel() {
        this.dataChannel = new MockDataChannel()
        setTimeout(() => this.dataChannel?.open(), 0)
        return this.dataChannel
      }
      async createOffer() { return { type: "offer" as const, sdp: "offer-sdp" } }
      async setLocalDescription(description: { type: "offer"; sdp: string }) {
        this.localDescription = description
      }
      async setRemoteDescription() {
        this.connectionState = "connected"
        this.onconnectionstatechange?.()
      }
      close() { this.connectionState = "closed" }
    }

    Object.defineProperty(globalThis, "RTCPeerConnection", {
      configurable: true,
      value: MockPeerConnection,
    })
  })

  await page.route("**/api/realtime/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        clientSecret: "ek_test-secret",
        expiresAt: 1_800_000_000,
        model: "gpt-realtime-2.1",
        realtimeUrl: "https://example.openai.azure.com/openai/v1/realtime/calls",
      }),
    })
  })
  await page.route("**/openai/v1/realtime/calls", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/sdp", body: "answer-sdp" })
  })

  await page.goto("/plan")
  await page.getByRole("button", { name: "Talk to Voyage" }).click()
  await page.getByRole("button", { name: "Start voice input" }).first().click()
  await expect(page.getByText("Listening", { exact: true })).toBeVisible()
  await expect.poll(async () => page.evaluate(() => {
    const events = (globalThis as Record<string, Array<Record<string, unknown>>>).__voyageSentEvents
    return events.some((event) => event.type === "session.update")
  })).toBe(true)

  await page.evaluate(() => {
    const channel = (globalThis as Record<string, { emit: (event: Record<string, unknown>) => void }>).__voyageDataChannel
    channel.emit({
      type: "input_audio_buffer.speech_started",
    })
    channel.emit({
      type: "response.output_audio_transcript.delta",
      delta: "I can help with that.",
    })
    channel.emit({
      type: "response.output_audio_transcript.done",
      transcript: "I can help with that.",
    })
    channel.emit({
      type: "conversation.item.input_audio_transcription.delta",
      delta: "Plan a trip",
    })
    channel.emit({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Plan a trip to Seoul",
    })
    channel.emit({
      type: "response.function_call_arguments.done",
      call_id: "call_trip_context",
      name: "get_trip_context",
      arguments: "{}",
    })
  })
  await expect.poll(async () => page.evaluate(() => {
    const events = (globalThis as Record<string, Array<Record<string, unknown>>>).__voyageSentEvents
    return events.some((event) => event.type === "conversation.item.create")
  })).toBe(true)
  await page.getByRole("button", { name: "Details" }).click()
  await expect(page.getByText("Plan a trip to Seoul", { exact: true }).last()).toBeVisible()
  await expect(page.locator(".bg-mist p.border-l-2")).toHaveText([
    "Plan a trip to Seoul",
    "I can help with that.",
  ])

  await expect(page.getByRole("button", { name: "Stop voice input" }).first()).toBeVisible()
  await page.getByRole("button", { name: "Stop voice input" }).first().click()
  await expect(page.getByRole("button", { name: "Start voice input" }).first()).toBeVisible()
})

test("filters stays and adds one to the itinerary", async ({ page }) => {
  await page.goto("/stays")

  await expect(page.getByRole("heading", { name: "Stay in Paris" })).toBeVisible()
  await expect(page.getByText("Active:", { exact: true })).not.toBeVisible()

  await page.getByRole("button", { name: "Rating", exact: true }).click()
  await page.getByLabel("From").selectOption("5")
  await expect(page.getByText("2 properties found")).toBeVisible()

  await page.getByRole("button", { name: "Add to itinerary" }).first().click()
  await expect(page).toHaveURL(/\/itinerary$/)
  await expect(page.getByRole("heading", { name: "Your Paris" })).toBeVisible()
  await expect(page.getByText("Maison Lumière").first()).toBeVisible()
})

test("books and cancels an itinerary through My Trips", async ({ page }) => {
  await page.goto("/stays")
  await expect(page.getByText("5 properties found")).toBeVisible()

  await page.getByRole("button", { name: "Add to itinerary" }).first().click()
  await page.getByRole("link", { name: "Review booking" }).click()
  await expect(page.getByRole("heading", { name: "Review your booking" })).toBeVisible()

  await page.getByRole("button", { name: "Confirm simulated booking" }).click()
  await expect(page.getByRole("heading", { name: /Your journey is confirmed/ })).toBeVisible()

  await page.getByRole("main").getByRole("link", { name: "My Trips" }).click()
  await expect(page.getByRole("heading", { name: "My Trips" })).toBeVisible()
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Cancel booking" }).click()
  await page.getByRole("button", { name: "Yes, cancel booking" }).click()
  await expect(page.getByText("No booked itinerary yet.")).toBeVisible()
  await expect(page.getByText("cancelled", { exact: true }).first()).toBeVisible()
})
