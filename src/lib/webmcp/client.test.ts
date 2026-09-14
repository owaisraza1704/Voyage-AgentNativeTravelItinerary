import { afterEach, describe, expect, it, vi } from "vitest"
import { executeWebMcpTool, getWebMcpTools } from "@/lib/webmcp/client"
import type { ModelContext, RegisteredWebMcpTool } from "@/lib/webmcp/types"

function createContext(overrides: Partial<ModelContext> = {}): ModelContext {
  return {
    registerTool: vi.fn(async () => undefined),
    ...overrides,
  }
}

function setContext(context: ModelContext) {
  vi.stubGlobal("document", { modelContext: context })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("WebMCP browser client", () => {
  it("lists the tools exposed by the browser", async () => {
    const tools: RegisteredWebMcpTool[] = [
      { name: "get_trip_context", inputSchema: {} },
    ]
    setContext(createContext({ getTools: vi.fn(async () => tools) }))

    await expect(getWebMcpTools()).resolves.toEqual(tools)
  })

  it("uses Chrome's serialized input and decodes its serialized result", async () => {
    const tool: RegisteredWebMcpTool = {
      name: "set_destination",
      inputSchema: "{\"type\":\"object\"}",
    }
    const executeTool = vi.fn(async () =>
      JSON.stringify({
        content: [{ type: "text", text: JSON.stringify({ ok: true, destination: "seoul" }) }],
      }),
    )
    setContext(createContext({ executeTool }))

    await expect(
      executeWebMcpTool(tool, { destinationId: "seoul" }),
    ).resolves.toEqual({ ok: true, destination: "seoul" })
    expect(executeTool).toHaveBeenCalledWith(
      tool,
      JSON.stringify({ destinationId: "seoul" }),
    )
  })

  it("keeps object input for runtimes using the draft API shape", async () => {
    const tool: RegisteredWebMcpTool = {
      name: "set_destination",
      inputSchema: { type: "object" },
    }
    const executeTool = vi.fn(async () => ({
      content: [{ type: "text", text: JSON.stringify({ ok: true }) }],
    }))
    setContext(createContext({ executeTool }))

    await executeWebMcpTool(tool, { destinationId: "seoul" })

    expect(executeTool).toHaveBeenCalledWith(tool, {
      destinationId: "seoul",
    })
  })

  it("reports when WebMCP is unavailable", async () => {
    vi.stubGlobal("document", {})

    await expect(getWebMcpTools()).rejects.toThrow(
      "WebMCP is not available in this browser.",
    )
  })
})
