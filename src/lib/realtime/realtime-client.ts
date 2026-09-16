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

  function setStatus(status: RealtimeVoiceStatus) {
    handlers.onStatusChange?.(status)
  }

  function emitServerEvent(value: unknown) {
    const event = value as { type?: unknown; error?: { message?: unknown } }
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

  async function connect() {
    if (peerConnection) return
    intentionallyClosed = false
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
      dataChannel.onopen = () => setStatus("listening")
      dataChannel.onmessage = (event) => {
        try {
          emitServerEvent(JSON.parse(event.data) as unknown)
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

  return { connect, close, sendEvent }
}
