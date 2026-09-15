"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { CloseIcon, MicIcon } from "@/components/icons"
import { useVoyage } from "@/components/voyage-provider"
import type { AgentMessage, AgentTool, AgentResponse } from "@/lib/agent-types"
import type { BookingRecord } from "@/lib/booking-types"
import { formatDateRange, formatPrice } from "@/lib/voyage-data"
import { executeWebMcpTool, getWebMcpTools } from "@/lib/webmcp/client"

const maxAgentTurns = 12

function isAffirmativeReply(value: string) {
  return /^(yes|yeah|yep|yup|confirm|confirmed|go ahead|do it|proceed|please do)([.!?,\s]|$)/i.test(value.trim())
}

function isNegativeReply(value: string) {
  return /^(no|nope|don't|do not|keep it|keep booking|keep planning|never mind)([.!?,\s]|$)/i.test(value.trim())
}

export function SiteShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [agentOpen, setAgentOpen] = useState(false)
  const { state } = useVoyage()

  useEffect(() => {
    const openAgent = () => setAgentOpen(true)
    document.addEventListener("voyage:open-agent", openAgent)
    return () => document.removeEventListener("voyage:open-agent", openAgent)
  }, [])

  return (
    <div className="min-h-screen bg-ivory text-charcoal font-sans">
      <SiteHeader onOpenAgent={() => setAgentOpen(true)} />
      {state.bookedItinerary && <ActiveBookingBanner />}
      <main>{children}</main>
      <AgentPanel open={agentOpen} onClose={() => setAgentOpen(false)} />
    </div>
  )
}

function ActiveBookingBanner() {
  return <div className="fixed left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-4 border border-gold/40 bg-ivory px-4 py-2 text-xs text-charcoal shadow-md"><span><span className="mr-1 uppercase tracking-[0.14em] text-gold">Active booking</span> You already have a confirmed itinerary.</span><Link href="/trips" className="font-medium underline underline-offset-4">View My Trips</Link></div>
}

function SiteHeader({ onOpenAgent }: { onOpenAgent: () => void }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const isHome = pathname === "/"

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 border-b transition-colors ${isHome ? "border-white/15 bg-charcoal/20 text-white backdrop-blur-sm" : "border-sand bg-ivory/95 text-charcoal backdrop-blur-md"}`}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" className="font-serif text-xl tracking-[0.22em]">VOYAGE</Link>

        <div className="hidden items-center gap-8 text-[13px] tracking-wide md:flex">
          <NavLink href="/explore" active={pathname.startsWith("/explore")}>Explore</NavLink>
          <NavLink href="/trips" active={pathname.startsWith("/trips")}>My Trips</NavLink>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={onOpenAgent} className={`flex items-center gap-2 px-4 py-2 text-[13px] tracking-wide transition-colors ${isHome ? "border border-white/35 hover:bg-white/10" : "bg-charcoal text-ivory hover:bg-gold"}`}>
            <MicIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Talk to Voyage</span>
          </button>
          <button onClick={() => setMenuOpen((open) => !open)} className="p-2 md:hidden" aria-label="Toggle navigation menu" aria-expanded={menuOpen}>
            <span className="block h-px w-5 bg-current" />
            <span className="mt-1.5 block h-px w-5 bg-current" />
          </button>
        </div>
      </nav>

      {menuOpen && (
          <div className={`border-t px-6 py-4 md:hidden ${isHome ? "border-white/15 bg-charcoal/95" : "border-sand bg-ivory"}`}>
          <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm">
            <Link href="/explore" onClick={() => setMenuOpen(false)}>Explore</Link>
            <Link href="/trips" onClick={() => setMenuOpen(false)}>My Trips</Link>
          </div>
        </div>
      )}
    </header>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`transition-opacity hover:opacity-100 ${active ? "opacity-100" : "opacity-65"}`}>{children}</Link>
}

function AgentPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [message, setMessage] = useState("")
  const [conversation, setConversation] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([])
  const [availableTools, setAvailableTools] = useState<AgentTool[]>([])
  const [toolStatus, setToolStatus] = useState<"checking" | "connected" | "unavailable">("checking")
  const [toolError, setToolError] = useState<string | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [bookingSummary, setBookingSummary] = useState<BookingSummary | null>(null)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [cancellationSummary, setCancellationSummary] = useState<BookingRecord | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const conversationEndRef = useRef<HTMLDivElement>(null)
  const { state } = useVoyage()
  const router = useRouter()

  useEffect(() => {
    if (!open) return

    let disposed = false
    getWebMcpTools()
      .then((tools) => {
        if (disposed) return
        setAvailableTools(tools)
        setToolStatus("connected")
      })
      .catch((error: unknown) => {
        if (disposed) return
        setToolStatus("unavailable")
        setToolError(error instanceof Error ? error.message : "WebMCP is unavailable.")
      })

    return () => {
      disposed = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const frame = window.requestAnimationFrame(() => {
      conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, conversation, bookingSummary, cancellationSummary, isThinking])

  async function requestAgent(messages: AgentMessage[], tools: AgentTool[]) {
    const toolDefinitions = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }))
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, tools: toolDefinitions }),
    })
    const payload = await response.json() as AgentResponse & { error?: string }
    if (!response.ok) throw new Error(payload.error ?? "The agent request failed.")
    return payload.message
  }

  async function submitMessage(value: string) {
    const trimmed = value.trim()
    if (!trimmed || isThinking || isRecording || isTranscribing) return

    setMessage("")
    setConversation((current) => [...current, { role: "user", content: trimmed }])

    if (isAffirmativeReply(trimmed) && bookingSummary) {
      await confirmBooking()
      return
    }

    if (isAffirmativeReply(trimmed) && cancellationSummary) {
      await confirmCancellation()
      return
    }

    if (isNegativeReply(trimmed) && (bookingSummary || cancellationSummary)) {
      setBookingSummary(null)
      setCancellationSummary(null)
      setBookingError(null)
      setConversation((current) => [
        ...current,
        { role: "assistant", content: "Understood. I won't change your booking." },
      ])
      return
    }

    setIsThinking(true)

    try {
      const tools = availableTools.length > 0 ? availableTools : await getWebMcpTools()
      if (availableTools.length === 0) {
        setAvailableTools(tools)
        setToolStatus("connected")
      }

      let messages: AgentMessage[] = [
        ...agentMessages,
        { role: "user", content: trimmed },
      ]

      for (let turn = 0; turn < maxAgentTurns; turn += 1) {
        const assistantMessage = await requestAgent(messages, tools)
        messages = [...messages, assistantMessage]
        setAgentMessages(messages)

        if (!assistantMessage.tool_calls?.length) {
          setConversation((current) => [
            ...current,
            { role: "assistant", content: assistantMessage.content ?? "I could not produce a response." },
          ])
          return
        }

        for (const toolCall of assistantMessage.tool_calls) {
          let toolResult: unknown
          const toolName = toolCall.function.name

          if (toolName === "book_itinerary" || toolName === "cancel_booking") {
            if (toolName === "cancel_booking" && state.bookedItinerary) {
              setCancellationSummary(state.bookedItinerary)
              setBookingError(null)
            }
            toolResult = {
              ok: false,
              code: "USER_CONFIRMATION_REQUIRED",
              message: "Show the user the relevant summary and wait for an explicit confirmation in the UI before executing this action.",
            }
          } else {
            const tool = tools.find((item) => item.name === toolName)
            if (!tool) {
              toolResult = { ok: false, code: "TOOL_NOT_FOUND", message: `The ${toolName} tool is unavailable.` }
            } else {
              try {
                const parsedArguments = JSON.parse(toolCall.function.arguments || "{}") as Record<string, unknown>
                toolResult = await executeWebMcpTool(tool, parsedArguments)
                if (toolName === "get_booking_summary") {
                  const summaryResult = toolResult as { ok?: boolean; summary?: BookingSummary }
                  if (summaryResult.ok && summaryResult.summary) {
                    setBookingSummary(summaryResult.summary)
                    setBookingError(null)
                  }
                }
              } catch (error: unknown) {
                toolResult = { ok: false, code: "TOOL_EXECUTION_FAILED", message: error instanceof Error ? error.message : "The WebMCP tool failed." }
              }
            }
          }

          const blockedResult = toolResult as { code?: string; message?: string }
          if (blockedResult.code === "ACTIVE_BOOKING_EXISTS") {
            setConversation((current) => [
              ...current,
              { role: "assistant", content: blockedResult.message ?? "You already have an active booking. Cancel it from My Trips before planning another itinerary." },
            ])
            return
          }

          messages = [
            ...messages,
            {
              role: "tool",
              content: JSON.stringify(toolResult),
              tool_call_id: toolCall.id,
              name: toolName,
            },
          ]
        }

        setAgentMessages(messages)
      }

      throw new Error(`The agent reached its ${maxAgentTurns}-step tool-call limit.`)
    } catch (error: unknown) {
      setConversation((current) => [
        ...current,
        { role: "assistant", content: error instanceof Error ? error.message : "The agent request failed." },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  async function transcribeAudio(audio: Blob) {
    setIsTranscribing(true)
    setVoiceError(null)

    try {
      const formData = new FormData()
      const extension = audio.type.includes("mp4") ? "mp4" : "webm"
      formData.append("audio", audio, `voyage-recording.${extension}`)
      const response = await fetch("/api/transcribe", { method: "POST", body: formData })
      const payload = await response.json() as { text?: string; error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Voice transcription failed.")
      if (!payload.text?.trim()) throw new Error("No speech was detected.")

      setMessage((current) => current.trim() ? `${current.trim()} ${payload.text?.trim()}` : payload.text?.trim() ?? "")
    } catch (error: unknown) {
      setVoiceError(error instanceof Error ? error.message : "Voice transcription failed.")
    } finally {
      setIsTranscribing(false)
    }
  }

  async function toggleVoiceInput() {
    if (isTranscribing) return
    if (isRecording) {
      recorderRef.current?.stop()
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError("Voice input is not supported in this browser.")
      return
    }

    setVoiceError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const supportedType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream)

      audioChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const audio = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" })
        stream.getTracks().forEach((track) => track.stop())
        recorderRef.current = null
        mediaStreamRef.current = null
        setIsRecording(false)
        void transcribeAudio(audio)
      }
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop())
        recorderRef.current = null
        mediaStreamRef.current = null
        setIsRecording(false)
        setVoiceError("Voice recording failed.")
      }

      recorderRef.current = recorder
      mediaStreamRef.current = stream
      recorder.start()
      setIsRecording(true)
    } catch (error: unknown) {
      setVoiceError(error instanceof Error ? error.message : "Microphone access was denied.")
    }
  }

  async function confirmBooking() {
    if (isThinking) return
    const tool = availableTools.find((item) => item.name === "book_itinerary")
    if (!tool) {
      setBookingError("The booking tool is unavailable.")
      return
    }

    setIsThinking(true)
    setBookingError(null)
    try {
      const result = await executeWebMcpTool(tool, { confirmation: "confirmed" }) as {
        ok?: boolean
        booking?: { reference?: string }
        message?: string
      }
      if (!result.ok) throw new Error(result.message ?? "The booking could not be completed.")

      setBookingSummary(null)
      setConversation((current) => [
        ...current,
        { role: "assistant", content: `Your journey is confirmed${result.booking?.reference ? ` · ${result.booking.reference}` : "."}` },
      ])
      onClose()
      router.push("/trips")
    } catch (error: unknown) {
      setBookingError(error instanceof Error ? error.message : "The booking could not be completed.")
    } finally {
      setIsThinking(false)
    }
  }

  async function confirmCancellation() {
    if (isThinking || !cancellationSummary) return
    const tool = availableTools.find((item) => item.name === "cancel_booking")
    if (!tool) {
      setBookingError("The cancellation tool is unavailable.")
      return
    }

    setIsThinking(true)
    setBookingError(null)
    try {
      const result = await executeWebMcpTool(tool, {
        bookingReference: cancellationSummary.reference,
        confirmation: "confirmed",
      }) as {
        ok?: boolean
        booking?: { reference?: string }
        message?: string
      }
      if (!result.ok) throw new Error(result.message ?? "The booking could not be cancelled.")

      setCancellationSummary(null)
      setConversation((current) => [
        ...current,
        { role: "assistant", content: `Your booking has been cancelled${result.booking?.reference ? ` · ${result.booking.reference}` : "."}` },
      ])
      onClose()
      router.push("/trips")
    } catch (error: unknown) {
      setBookingError(error instanceof Error ? error.message : "The booking could not be cancelled.")
    } finally {
      setIsThinking(false)
    }
  }

  function clearChat() {
    if (isThinking) return
    setMessage("")
    setConversation([])
    setAgentMessages([])
    setBookingSummary(null)
    setCancellationSummary(null)
    setBookingError(null)
  }

  if (!open) return null

  const toolStatusLabel = toolStatus === "checking" ? "Connecting…" : toolStatus === "connected" ? `${availableTools.length} tools connected` : "Unavailable"

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/55 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-ivory shadow-2xl" aria-label="Voyage AI assistant">
        <div className="flex items-center justify-between border-b border-sand px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-taupe">Agent workspace</p>
            <h2 className="mt-1 font-serif text-2xl">Plan with Voyage</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={clearChat} disabled={isThinking} className="text-xs text-taupe transition-colors hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-50">Clear chat</button>
            <button onClick={onClose} className="p-2 text-taupe transition-colors hover:text-charcoal" aria-label="Close assistant"><CloseIcon className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-7">
          <div className="border border-sand bg-mist p-5">
            <div className="mb-4 flex h-12 items-center justify-center gap-1.5">
              {Array.from({ length: 18 }).map((_, index) => <span key={index} className="voice-bar w-0.5 rounded-full bg-gold" style={{ animationDelay: `${index * 55}ms` }} />)}
            </div>
            <p className="text-center text-sm leading-relaxed text-taupe">Tell me where you want to go, your dates, and what matters to you.</p>
            <div className="mt-4 flex items-center justify-between border-t border-sand pt-3 text-[10px] uppercase tracking-[0.14em]">
              <span className="text-taupe">WebMCP</span>
              <span className={toolStatus === "connected" ? "text-green-800" : "text-taupe"}>{toolStatusLabel}</span>
            </div>
            {toolError && <p className="mt-3 text-center text-xs text-red-900">{toolError}</p>}
          </div>

          <div className="mt-8 space-y-4">
            {conversation.length === 0 ? (
              <button onClick={() => void submitMessage("Set my destination to Seoul.")} disabled={toolStatus !== "connected" || isThinking} className="w-full border border-sand p-4 text-left text-sm leading-relaxed transition-colors hover:border-charcoal disabled:cursor-not-allowed disabled:opacity-50">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-taupe">Ask the Voyage agent</span>
                Set my destination to Seoul.
              </button>
            ) : conversation.map((item, index) => <p key={`${item.role}-${item.content}-${index}`} className={`whitespace-pre-line border-l-2 pl-4 text-sm leading-relaxed ${item.role === "user" ? "border-charcoal text-charcoal" : "border-gold text-taupe"}`}>{formatAgentText(item.content)}</p>)}
            {isThinking && <p className="border-l-2 border-gold pl-4 text-sm text-taupe">Voyage is thinking…</p>}
            {bookingSummary && <BookingConfirmationCard summary={bookingSummary} bookingError={bookingError} disabled={isThinking} onConfirm={() => void confirmBooking()} onKeepPlanning={() => { setBookingSummary(null); setBookingError(null) }} />}
            {cancellationSummary && <CancellationConfirmationCard booking={cancellationSummary} bookingError={bookingError} disabled={isThinking} onConfirm={() => void confirmCancellation()} onKeepPlanning={() => { setCancellationSummary(null); setBookingError(null) }} />}
            <div ref={conversationEndRef} aria-hidden="true" />
          </div>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void submitMessage(message) }} className="border-t border-sand p-5">
          <div className="flex items-center gap-3 border border-sand bg-white px-4 py-2 focus-within:border-charcoal">
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask Voyage anything..." className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-taupe" />
            <button type="button" onClick={() => void toggleVoiceInput()} disabled={isThinking || isTranscribing} className={`transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isRecording ? "text-red-900" : "text-taupe hover:text-charcoal"}`} aria-label={isRecording ? "Stop voice input" : "Use voice input"} aria-pressed={isRecording}><MicIcon className="h-4 w-4" /></button>
            <button type="submit" disabled={isThinking || isRecording || isTranscribing || toolStatus !== "connected"} className="text-sm text-charcoal transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-50">Send</button>
          </div>
          {isRecording && <p role="status" className="mt-2 text-center text-xs text-red-900">Listening… click the microphone to stop.</p>}
          {isTranscribing && <p role="status" className="mt-2 text-center text-xs text-taupe">Transcribing…</p>}
          {voiceError && <p role="alert" className="mt-2 text-center text-xs text-red-900">{voiceError}</p>}
          <p className="mt-3 text-center text-[10px] uppercase tracking-[0.16em] text-taupe">Azure OpenAI · WebMCP tools · local travel data</p>
        </form>
      </aside>
    </div>
  )
}

type BookingSummary = {
  destination: { name: string; country: string }
  dates: { startDate: string; endDate: string; nights: number }
  travelers: { adults: number; children: number }
  selectedStay: { name: string; total: number }
  total: number
}

function formatAgentText(content: string) {
  return content
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
}

function BookingConfirmationCard({ summary, bookingError, disabled, onConfirm, onKeepPlanning }: { summary: BookingSummary; bookingError: string | null; disabled: boolean; onConfirm: () => void; onKeepPlanning: () => void }) {
  return <section className="border border-gold/60 bg-gold/5 p-5" aria-label="Booking confirmation">
    <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Review before booking</p>
    <h3 className="mt-2 font-serif text-2xl text-charcoal">{summary.selectedStay.name}</h3>
    <p className="mt-1 text-sm text-taupe">{summary.destination.name}, {summary.destination.country}</p>
    <div className="mt-5 space-y-2 border-t border-gold/20 pt-4 text-sm">
      <div className="flex justify-between gap-4"><span className="text-taupe">Dates</span><span className="text-right text-charcoal">{formatDateRange(summary.dates.startDate, summary.dates.endDate)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-taupe">Travelers</span><span className="text-right text-charcoal">{summary.travelers.adults} adults{summary.travelers.children ? `, ${summary.travelers.children} children` : ""}</span></div>
      <div className="flex justify-between gap-4"><span className="text-taupe">Duration</span><span className="text-right text-charcoal">{summary.dates.nights} nights</span></div>
      <div className="flex justify-between gap-4 border-t border-gold/20 pt-3"><span className="font-medium text-charcoal">Total</span><span className="font-serif text-xl text-charcoal">{formatPrice(summary.total)}</span></div>
    </div>
    {bookingError && <p className="mt-4 border border-red-900/20 bg-red-50/50 p-3 text-xs leading-relaxed text-red-900">{bookingError}</p>}
    <div className="mt-5 flex gap-3">
      <button onClick={onConfirm} disabled={disabled} className="flex-1 bg-charcoal px-4 py-3 text-xs uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50">{disabled ? "Booking…" : "Confirm booking"}</button>
      <button onClick={onKeepPlanning} disabled={disabled} className="border border-sand px-4 py-3 text-xs text-charcoal transition-colors hover:border-charcoal disabled:cursor-not-allowed disabled:opacity-50">Keep planning</button>
    </div>
  </section>
}

function CancellationConfirmationCard({ booking, bookingError, disabled, onConfirm, onKeepPlanning }: { booking: BookingRecord; bookingError: string | null; disabled: boolean; onConfirm: () => void; onKeepPlanning: () => void }) {
  return <section className="mt-6 border border-red-900/30 bg-red-50/30 p-5" aria-label="Cancellation confirmation">
    <p className="text-[10px] uppercase tracking-[0.18em] text-red-900">Review before cancelling</p>
    <h3 className="mt-2 font-serif text-2xl text-charcoal">{booking.hotelName}</h3>
    <p className="mt-1 text-sm text-taupe">{booking.destinationName}, {booking.destinationCountry}</p>
    <div className="mt-5 space-y-2 border-t border-red-900/15 pt-4 text-sm">
      <div className="flex justify-between gap-4"><span className="text-taupe">Confirmation</span><span className="text-right text-charcoal">{booking.reference}</span></div>
      <div className="flex justify-between gap-4"><span className="text-taupe">Dates</span><span className="text-right text-charcoal">{formatDateRange(booking.startDate, booking.endDate)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-taupe">Total paid</span><span className="font-serif text-xl text-charcoal">{formatPrice(booking.total)}</span></div>
    </div>
    {bookingError && <p className="mt-4 border border-red-900/20 bg-red-50/50 p-3 text-xs leading-relaxed text-red-900">{bookingError}</p>}
    <div className="mt-5 flex gap-3">
      <button onClick={onConfirm} disabled={disabled} className="flex-1 bg-red-900 px-4 py-3 text-xs uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-50">{disabled ? "Cancelling…" : "Confirm cancellation"}</button>
      <button onClick={onKeepPlanning} disabled={disabled} className="border border-sand px-4 py-3 text-xs text-charcoal transition-colors hover:border-charcoal disabled:cursor-not-allowed disabled:opacity-50">Keep booking</button>
    </div>
  </section>
}
