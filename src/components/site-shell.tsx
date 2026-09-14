"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { CloseIcon, MicIcon } from "@/components/icons"
import { useVoyage } from "@/components/voyage-provider"
import { executeWebMcpTool, getWebMcpTools } from "@/lib/webmcp/client"

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
      {agentOpen && <AgentPanel onClose={() => setAgentOpen(false)} />}
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

function AgentPanel({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("")
  const [conversation, setConversation] = useState<string[]>([])
  const [toolStatus, setToolStatus] = useState<"checking" | "connected" | "unavailable">("checking")
  const [toolCount, setToolCount] = useState(0)
  const [toolError, setToolError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    getWebMcpTools()
      .then((tools) => {
        if (disposed) return
        setToolCount(tools.length)
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
  }, [])

  async function runExample() {
    const userMessage = "Set my destination to Seoul."
    setConversation((current) => [...current, userMessage])

    try {
      const tools = await getWebMcpTools()
      const tool = tools.find((item) => item.name === "set_destination")
      if (!tool) throw new Error("The set_destination tool is not available.")

      const result = await executeWebMcpTool(tool, { destinationId: "seoul" })
      setConversation((current) => [
        ...current,
        `WebMCP result: ${JSON.stringify(result)}`,
      ])
    } catch (error: unknown) {
      setConversation((current) => [
        ...current,
        error instanceof Error ? error.message : "The WebMCP tool failed.",
      ])
    }
  }

  function submitMessage(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    setConversation((current) => [...current, trimmed, "The text agent connection will be added next. Use the WebMCP example below to test the live tool bridge."])
    setMessage("")
  }

  const toolStatusLabel = toolStatus === "checking" ? "Connecting…" : toolStatus === "connected" ? `${toolCount} tools connected` : "Unavailable"

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/55 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-ivory shadow-2xl" aria-label="Voyage AI assistant">
        <div className="flex items-center justify-between border-b border-sand px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-taupe">Agent workspace</p>
            <h2 className="mt-1 font-serif text-2xl">Plan with Voyage</h2>
          </div>
          <button onClick={onClose} className="p-2 text-taupe transition-colors hover:text-charcoal" aria-label="Close assistant"><CloseIcon className="h-5 w-5" /></button>
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
              <button onClick={runExample} disabled={toolStatus !== "connected"} className="w-full border border-sand p-4 text-left text-sm leading-relaxed transition-colors hover:border-charcoal disabled:cursor-not-allowed disabled:opacity-50">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-taupe">Run a WebMCP example</span>
                Set my destination to Seoul.
              </button>
            ) : conversation.map((item, index) => <p key={`${item}-${index}`} className={`border-l-2 pl-4 text-sm leading-relaxed ${index % 2 === 0 ? "border-charcoal text-charcoal" : "border-gold text-taupe"}`}>{item}</p>)}
          </div>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); submitMessage(message) }} className="border-t border-sand p-5">
          <div className="flex items-center gap-3 border border-sand bg-white px-4 py-2 focus-within:border-charcoal">
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask Voyage anything..." className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-taupe" />
            <button type="button" className="text-taupe transition-colors hover:text-charcoal" aria-label="Use voice input"><MicIcon className="h-4 w-4" /></button>
            <button type="submit" className="text-sm text-charcoal transition-colors hover:text-gold">Send</button>
          </div>
          <p className="mt-3 text-center text-[10px] uppercase tracking-[0.16em] text-taupe">WebMCP tools · local travel data</p>
        </form>
      </aside>
    </div>
  )
}
