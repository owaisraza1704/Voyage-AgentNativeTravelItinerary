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

test("transcribes microphone input into the agent message field", async ({ page }) => {
  await page.addInitScript(() => {
    const tracks = [{ stop() {} }]
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => tracks }) },
    })

    class MockMediaRecorder {
      static isTypeSupported() { return true }
      mimeType = "audio/webm;codecs=opus"
      ondataavailable: ((event: { data: Blob }) => void) | null = null
      onstop: (() => void) | null = null
      onerror: (() => void) | null = null
      start() {}
      stop() {
        this.ondataavailable?.({ data: new Blob(["audio"], { type: "audio/webm" }) })
        this.onstop?.()
      }
    }
    Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: MockMediaRecorder })
  })
  await page.route("**/api/transcribe", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ text: "Plan a trip to Seoul" }),
    })
  })

  await page.goto("/plan")
  await page.getByRole("button", { name: "Talk to Voyage" }).click()
  await page.getByRole("button", { name: "Start voice input" }).first().click()
  await expect(page.getByRole("button", { name: "Stop voice input" }).first()).toBeVisible()
  await page.getByRole("button", { name: "Stop voice input" }).first().click()

  await expect(page.getByPlaceholder("Ask Voyage anything...")).toHaveValue("Plan a trip to Seoul")
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
