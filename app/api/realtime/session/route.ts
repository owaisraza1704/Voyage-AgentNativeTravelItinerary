import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const clientSecretLifetimeSeconds = 600

function getRealtimeConfig() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const deployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT
  const transcriptionDeployment = process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT

  if (!apiKey || !endpoint || !deployment) {
    throw new Error(
      "Azure Realtime is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_REALTIME_DEPLOYMENT.",
    )
  }

  return {
    apiKey,
    endpoint: endpoint.replace(/\/$/, ""),
    deployment,
    transcriptionDeployment,
  }
}

export async function POST() {
  try {
    const { apiKey, endpoint, deployment, transcriptionDeployment } =
      getRealtimeConfig()
    const response = await fetch(`${endpoint}/openai/v1/realtime/client_secrets`, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expires_after: {
          anchor: "created_at",
          seconds: clientSecretLifetimeSeconds,
        },
        session: {
          type: "realtime",
          model: deployment,
          output_modalities: ["audio"],
          audio: transcriptionDeployment
            ? { input: { transcription: { model: transcriptionDeployment } } }
            : undefined,
          instructions:
            "You are Voyage, a concise and helpful travel planning assistant. Keep spoken responses brief and conversational.",
        },
      }),
    })
    const payload = (await response.json()) as {
      value?: string
      expires_at?: number
      error?: { message?: string }
    }

    if (!response.ok || !payload.value || !payload.expires_at) {
      return NextResponse.json(
        {
          error:
            payload.error?.message ??
            "Azure Realtime did not return a valid client secret.",
        },
        { status: 502 },
      )
    }

    return NextResponse.json(
      {
        clientSecret: payload.value,
        expiresAt: payload.expires_at,
        model: deployment,
        realtimeUrl: `${endpoint}/openai/v1/realtime/calls`,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    )
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to create a Realtime session."
    const isConfigurationError = message.startsWith(
      "Azure Realtime is not configured.",
    )

    return NextResponse.json(
      { error: message },
      { status: isConfigurationError ? 503 : 502 },
    )
  }
}
