import type { ModelContext, WebMcpResult, WebMcpTool } from "@/lib/webmcp/types"
import { getDestination } from "@/lib/voyage-data"

type VoyageToolActions = {
  setDestination: (destinationId: string) => void
}

function result(payload: Record<string, unknown>): WebMcpResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
  }
}

export async function registerVoyageTools(modelContext: ModelContext, actions: VoyageToolActions, signal: AbortSignal) {
  const setDestinationTool: WebMcpTool = {
    name: "set_destination",
    description: "Set the destination for the current Voyage trip.",
    inputSchema: {
      type: "object",
      properties: {
        destinationId: {
          type: "string",
          description: "The stable Voyage destination ID, such as paris or seoul.",
        },
      },
      required: ["destinationId"],
      additionalProperties: false,
    },
    execute(input) {
      const destinationId = typeof input === "object" && input !== null && "destinationId" in input
        ? (input as { destinationId?: unknown }).destinationId
        : undefined
      const destination = typeof destinationId === "string" ? getDestination(destinationId) : undefined

      if (!destination) {
        return result({
          ok: false,
          code: "DESTINATION_NOT_FOUND",
          message: "That destination is not available in Voyage.",
          suggestions: ["Use a destination ID from the available Voyage destinations."],
        })
      }

      actions.setDestination(destination.id)
      return result({
        ok: true,
        destination: {
          id: destination.id,
          name: destination.name,
          country: destination.country,
        },
      })
    },
  }

  await modelContext.registerTool(setDestinationTool, { signal })
}

