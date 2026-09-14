import { NextResponse } from "next/server"
import { AzureOpenAI } from "openai"

export async function POST(request: Request) {
  try {
    const apiKey = process.env.AZURE_OPENAI_API_KEY
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT
    const deployment = process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT
    const apiVersion =
      process.env.AZURE_OPENAI_API_VERSION ??
      process.env.OPENAI_API_VERSION ??
      "2024-10-21"

    if (!apiKey || !endpoint || !deployment) {
      return NextResponse.json(
        { error: "Voice transcription is not configured. Set AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT." },
        { status: 503 },
      )
    }

    const formData = await request.formData()
    const audio = formData.get("audio")
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json(
        { error: "A recorded audio file is required." },
        { status: 400 },
      )
    }

    const client = new AzureOpenAI({ apiKey, endpoint, deployment, apiVersion })
    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: deployment,
    })

    return NextResponse.json({ text: transcription.text })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Voice transcription failed."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
