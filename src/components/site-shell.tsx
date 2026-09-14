"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { CloseIcon, MicIcon } from "@/components/icons"

export function SiteShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [agentOpen, setAgentOpen] = useState(false)

  useEffect(() => {
    const openAgent = () => setAgentOpen(true)
    document.addEventListener("voyage:open-agent", openAgent)
    return () => document.removeEventListener("voyage:open-agent", openAgent)
  }, [])

  return (
    <div className="min-h-screen bg-ivory text-charcoal font-sans">
      <SiteHeader onOpenAgent={() => setAgentOpen(true)} />
      <main>{children}</main>
      {agentOpen && <AgentPanel onClose={() => setAgentOpen(false)} />}
    </div>
  )
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
          <NavLink href="/" active={pathname === "/"}>Explore</NavLink>
          <NavLink href="/stays" active={pathname.startsWith("/stays")}>Stays</NavLink>
          <NavLink href="/itinerary" active={pathname.startsWith("/itinerary")}>Itinerary</NavLink>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/itinerary" className="hidden text-[13px] tracking-wide opacity-70 transition-opacity hover:opacity-100 md:block">My Trips</Link>
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
            <Link href="/" onClick={() => setMenuOpen(false)}>Explore</Link>
            <Link href="/stays" onClick={() => setMenuOpen(false)}>Stays</Link>
            <Link href="/itinerary" onClick={() => setMenuOpen(false)}>Itinerary</Link>
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

  function submitMessage(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    setConversation((current) => [...current, trimmed, "I’ll use the trip tools to turn that into a plan. This demo panel is ready for the WebMCP agent connection."])
    setMessage("")
  }

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
          </div>

          <div className="mt-8 space-y-4">
            {conversation.length === 0 ? (
              <button onClick={() => submitMessage("Find me a five-star hotel in Paris for six nights with breakfast included.")} className="w-full border border-sand p-4 text-left text-sm leading-relaxed transition-colors hover:border-charcoal">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-taupe">Try an example</span>
                Find me a five-star hotel in Paris for six nights with breakfast included.
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
