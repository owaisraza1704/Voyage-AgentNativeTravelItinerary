import { beforeEach, describe, expect, it, vi } from "vitest"

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }))

import { POST } from "./route"

describe("POST /api/realtime/session", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AZURE_OPENAI_API_KEY = "test-key"
    process.env.AZURE_OPENAI_ENDPOINT = "https://example.openai.azure.com"
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = "voyage-realtime"
    process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT = "voyage-transcribe"
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          value: "ek_test-secret",
          expires_at: 1_800_000_000,
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)
  })

  it("creates a short-lived Realtime client secret without exposing the API key", async () => {
    const response = await POST()

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("no-store")
    await expect(response.json()).resolves.toEqual({
      clientSecret: "ek_test-secret",
      expiresAt: 1_800_000_000,
      model: "voyage-realtime",
      realtimeUrl: "https://example.openai.azure.com/openai/v1/realtime/calls",
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.openai.azure.com/openai/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          "api-key": "test-key",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          expires_after: { anchor: "created_at", seconds: 600 },
          session: {
            type: "realtime",
            model: "voyage-realtime",
            output_modalities: ["audio"],
            audio: { input: { transcription: { model: "voyage-transcribe" } } },
            instructions:
              "You are Voyage, a concise and helpful travel planning assistant. Keep spoken responses brief and conversational.",
          },
        }),
      },
    )
  })

  it("reports missing Realtime configuration without calling Azure", async () => {
    delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT

    const response = await POST()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error:
        "Azure Realtime is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_REALTIME_DEPLOYMENT.",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
