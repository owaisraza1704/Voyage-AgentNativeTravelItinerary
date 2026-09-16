import { describe, expect, it } from "vitest"
import { parseRealtimeServerEvent } from "./realtime-client"

describe("Realtime server events", () => {
  it("returns incremental transcript deltas", () => {
    expect(
      parseRealtimeServerEvent({
        type: "conversation.item.input_audio_transcription.delta",
        delta: "Plan a trip",
      }),
    ).toEqual([{ type: "user-transcript-delta", text: "Plan a trip" }])

    expect(
      parseRealtimeServerEvent({
        type: "response.output_audio_transcript.delta",
        delta: "Paris is",
      }),
    ).toEqual([{ type: "assistant-transcript-delta", text: "Paris is" }])
  })

  it("returns completed user and assistant transcripts", () => {
    expect(
      parseRealtimeServerEvent({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: "Plan a trip to Paris",
      }),
    ).toEqual([{ type: "user-transcript", text: "Plan a trip to Paris" }])

    expect(
      parseRealtimeServerEvent({
        type: "response.audio_transcript.done",
        transcript: "Paris is ready.",
      }),
    ).toEqual([{ type: "assistant-transcript", text: "Paris is ready." }])
  })

  it("maps speech and response lifecycle events", () => {
    expect(parseRealtimeServerEvent({ type: "input_audio_buffer.speech_started" })).toEqual([
      { type: "user-speech-started" },
    ])
    expect(parseRealtimeServerEvent({ type: "response.created" })).toEqual([
      { type: "assistant-response-started" },
    ])
    expect(parseRealtimeServerEvent({ type: "response.done" })).toEqual([
      { type: "assistant-response-completed" },
    ])
  })

  it("ignores unsupported events", () => {
    expect(parseRealtimeServerEvent({ type: "session.updated" })).toEqual([])
    expect(parseRealtimeServerEvent(null)).toEqual([])
  })
})
