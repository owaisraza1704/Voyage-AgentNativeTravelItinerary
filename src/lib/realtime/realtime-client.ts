import type { AgentTool } from "@/lib/agent-types"

export type RealtimeVoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "error"

export type RealtimeVoiceEvent =
  | { type: "user-transcript-delta"; text: string }
  | { type: "user-transcript"; text: string }
  | { type: "assistant-transcript-delta"; text: string }
  | { type: "assistant-transcript"; text: string }
  | { type: "user-speech-started" }
  | { type: "user-speech-stopped" }
  | { type: "assistant-response-started" }
  | { type: "assistant-response-completed" }

export type RealtimeVoiceHandlers = {
  onStatusChange?: (status: RealtimeVoiceStatus) => void
  onEvent?: (event: RealtimeVoiceEvent) => void
  onError?: (message: string) => void
  onToolCall?: (call: RealtimeToolCall) => Promise<unknown>
}

export type RealtimeToolCall = {
  callId: string
  name: string
  arguments: Record<string, unknown>
}

type RealtimeSessionResponse = {
  clientSecret?: string
  realtimeUrl?: string
  error?: string
}

export function parseRealtimeServerEvent(value: unknown): RealtimeVoiceEvent[] {
  if (!value || typeof value !== "object") return []

  const event = value as {
    type?: unknown
    delta?: unknown
    transcript?: unknown
  }
  if (typeof event.type !== "string") return []

  if (
    event.type === "conversation.item.input_audio_transcription.delta" &&
    typeof event.delta === "string" &&
    event.delta
  ) {
    return [{ type: "user-transcript-delta", text: event.delta }]
  }

  if (
    event.type === "conversation.item.input_audio_transcription.completed" &&
    typeof event.transcript === "string" &&
    event.transcript.trim()
  ) {
    return [{ type: "user-transcript", text: event.transcript.trim() }]
  }

  if (
    (event.type === "response.output_audio_transcript.delta" ||
      event.type === "response.audio_transcript.delta") &&
    typeof event.delta === "string" &&
    event.delta
  ) {
    return [{ type: "assistant-transcript-delta", text: event.delta }]
  }

  if (
    (event.type === "response.audio_transcript.done" ||
      event.type === "response.output_audio_transcript.done") &&
    typeof event.transcript === "string" &&
    event.transcript.trim()
  ) {
    return [{ type: "assistant-transcript", text: event.transcript.trim() }]
  }

  if (event.type === "input_audio_buffer.speech_started") {
    return [{ type: "user-speech-started" }]
  }

  if (event.type === "input_audio_buffer.speech_stopped") {
    return [{ type: "user-speech-stopped" }]
  }

  if (
    event.type === "response.created" ||
    event.type === "output_audio_buffer.started"
  ) {
    return [{ type: "assistant-response-started" }]
  }

  if (
    event.type === "response.done" ||
    event.type === "output_audio_buffer.stopped"
  ) {
    return [{ type: "assistant-response-completed" }]
  }

  return []
}

export function createRealtimeVoiceSession(
  audioElement: HTMLAudioElement,
  handlers: RealtimeVoiceHandlers = {},
) {
  let peerConnection: RTCPeerConnection | null = null
  let dataChannel: RTCDataChannel | null = null
  let mediaStream: MediaStream | null = null
  let intentionallyClosed = false
  let tools: AgentTool[] = []
  let responseActive = false
  let responseRequested = false

  function setStatus(status: RealtimeVoiceStatus) {
    handlers.onStatusChange?.(status)
  }

  function emitServerEvent(value: unknown) {
    const event = value as { type?: unknown; error?: { message?: unknown } }
    if (event.type === "response.created") responseActive = true
    if (
      event.type === "response.done" ||
      event.type === "response.cancelled" ||
      event.type === "response.failed"
    ) {
      responseActive = false
      if (responseRequested) {
        responseRequested = false
        requestResponse()
      }
    }

    if (event.type === "error") {
      const message =
        typeof event.error?.message === "string"
          ? event.error.message
          : "The Realtime session returned an error."
      handlers.onError?.(message)
      setStatus("error")
      return
    }

    for (const parsedEvent of parseRealtimeServerEvent(value)) {
      if (parsedEvent.type === "assistant-response-started") {
        setStatus("speaking")
      }
      if (parsedEvent.type === "assistant-response-completed") {
        setStatus("listening")
      }
      handlers.onEvent?.(parsedEvent)
    }
  }

  function clearResources() {
    dataChannel?.close()
    dataChannel = null
    peerConnection?.close()
    peerConnection = null
    mediaStream?.getTracks().forEach((track) => track.stop())
    mediaStream = null
    audioElement.srcObject = null
  }

  function sendToolDefinitions() {
    if (tools.length === 0) return

    sendEvent({
      type: "session.update",
      session: {
        type: "realtime",
        tools: tools.map((tool) => {
          let parameters = tool.inputSchema
          if (typeof parameters === "string") {
            try {
              parameters = JSON.parse(parameters) as Record<string, unknown>
            } catch {
              parameters = undefined
            }
          }

          return {
            type: "function",
            name: tool.name,
            description: tool.description ?? "Voyage travel tool.",
            parameters: parameters ?? {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          }
        }),
      },
    })
  }

  async function handleToolCall(event: Record<string, unknown>) {
    const callId =
      typeof event.call_id === "string"
        ? event.call_id
        : typeof (event.item as { call_id?: unknown } | undefined)?.call_id ===
            "string"
          ? ((event.item as { call_id: string }).call_id)
          : undefined
    const name = typeof event.name === "string" ? event.name : undefined
    const rawArguments =
      typeof event.arguments === "string" ? event.arguments : "{}"

    if (!callId || !name) return

    let output: unknown
    try {
      const parsedArguments = JSON.parse(rawArguments) as unknown
      if (
        !parsedArguments ||
        typeof parsedArguments !== "object" ||
        Array.isArray(parsedArguments)
      ) {
        throw new Error("Tool arguments must be a JSON object.")
      }
      output = handlers.onToolCall
        ? await handlers.onToolCall({
            callId,
            name,
            arguments: parsedArguments as Record<string, unknown>,
          })
        : { ok: false, code: "TOOL_HANDLER_UNAVAILABLE" }
    } catch (error: unknown) {
      output = {
        ok: false,
        code: "TOOL_EXECUTION_FAILED",
        message:
          error instanceof Error ? error.message : "The voice tool failed.",
      }
    }

    sendEvent({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(output),
      },
    })
    requestResponse()
  }

  async function connect(nextTools: AgentTool[] = []) {
    if (peerConnection) return
    intentionallyClosed = false
    tools = nextTools
    setStatus("connecting")

    try {
      if (
        typeof RTCPeerConnection === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error("Realtime voice is not supported in this browser.")
      }

      const sessionResponse = await fetch("/api/realtime/session", {
        method: "POST",
      })
      const session = (await sessionResponse.json()) as RealtimeSessionResponse
      if (!sessionResponse.ok || !session.clientSecret || !session.realtimeUrl) {
        throw new Error(session.error ?? "Unable to start the Realtime session.")
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      peerConnection = new RTCPeerConnection()
      peerConnection.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track])
        audioElement.srcObject = stream
        void audioElement.play().catch(() => undefined)
      }
      peerConnection.onconnectionstatechange = () => {
        if (
          !intentionallyClosed &&
          (peerConnection?.connectionState === "failed" ||
            peerConnection?.connectionState === "disconnected")
        ) {
          const message = "The Realtime voice connection was lost."
          handlers.onError?.(message)
          setStatus("error")
          clearResources()
        }
      }

      for (const track of mediaStream.getTracks()) {
        peerConnection.addTrack(track, mediaStream)
      }

      dataChannel = peerConnection.createDataChannel("oai-events")
      dataChannel.onopen = () => {
        setStatus("listening")
        sendToolDefinitions()
      }
      dataChannel.onmessage = (event) => {
        try {
          const value = JSON.parse(event.data) as Record<string, unknown>
          if (value.type === "response.function_call_arguments.done") {
            void handleToolCall(value)
            return
          }
          emitServerEvent(value)
        } catch {
          handlers.onError?.("The Realtime session sent an invalid event.")
        }
      }
      dataChannel.onerror = () => {
        if (!intentionallyClosed) {
          const message = "The Realtime event channel failed."
          handlers.onError?.(message)
          setStatus("error")
        }
      }

      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      const localDescription = peerConnection.localDescription
      if (!localDescription?.sdp) {
        throw new Error("The browser did not create a Realtime SDP offer.")
      }

      const answerResponse = await fetch(session.realtimeUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: localDescription.sdp,
      })
      if (!answerResponse.ok) {
        throw new Error("Azure Realtime rejected the browser connection.")
      }

      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: await answerResponse.text(),
      })
    } catch (error: unknown) {
      clearResources()
      const message =
        error instanceof Error ? error.message : "Unable to start voice mode."
      handlers.onError?.(message)
      setStatus("error")
      throw error
    }
  }

  function close() {
    intentionallyClosed = true
    clearResources()
    setStatus("idle")
  }

  function sendEvent(event: Record<string, unknown>) {
    if (!dataChannel || dataChannel.readyState !== "open") {
      throw new Error("The Realtime event channel is not connected.")
    }
    dataChannel.send(JSON.stringify(event))
  }

  function requestResponse() {
    if (responseActive) {
      responseRequested = true
      return
    }
    sendEvent({ type: "response.create" })
    responseActive = true
  }

  return { connect, close, sendEvent, requestResponse }
}
