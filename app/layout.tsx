import type { Metadata } from "next"
import "@/index.css"
import { SiteShell } from "@/components/site-shell"
import { VoyageProvider } from "@/components/voyage-provider"
import { WebMcpProvider } from "@/components/webmcp-provider"

export const metadata: Metadata = {
  title: "Voyage — Plan your next journey",
  description: "A voice-first travel planning experience powered by Voyage.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <VoyageProvider>
          <WebMcpProvider>
            <SiteShell>{children}</SiteShell>
          </WebMcpProvider>
        </VoyageProvider>
      </body>
    </html>
  )
}
