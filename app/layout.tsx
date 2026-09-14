import type { Metadata } from "next"
import "@/index.css"
import { SiteShell } from "@/components/site-shell"
import { VoyageProvider } from "@/components/voyage-provider"

export const metadata: Metadata = {
  title: "Voyage — Plan your next journey",
  description: "A voice-first travel planning experience powered by Voyage.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <VoyageProvider>
          <SiteShell>{children}</SiteShell>
        </VoyageProvider>
      </body>
    </html>
  )
}
