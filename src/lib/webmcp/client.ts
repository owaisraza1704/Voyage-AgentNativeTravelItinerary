import type {
  ModelContext,
  RegisteredWebMcpTool,
  WebMcpResult,
} from "@/lib/webmcp/types"

function getModelContext(): ModelContext {
  if (typeof document === "undefined" || !document.modelContext) {
    throw new Error("WebMCP is not available in this browser.")
  }

  return document.modelContext
}

export async function getWebMcpTools() {
  const context = getModelContext()
  if (!context.getTools) {
    throw new Error("This browser cannot list WebMCP tools.")
  }

  return context.getTools()
}

export async function executeWebMcpTool(
  tool: RegisteredWebMcpTool,
  input: Record<string, unknown> = {},
) {
  const context = getModelContext()
  if (!context.executeTool) {
    throw new Error("This browser cannot execute WebMCP tools.")
  }

  const browserInput =
    typeof tool.inputSchema === "string" ? JSON.stringify(input) : input
  const rawResult = await context.executeTool(tool, browserInput)
  const browserResult = parseJson(rawResult)

  if (isWebMcpResult(browserResult)) {
    return parseJson(browserResult.content[0]?.text)
  }

  return browserResult
}

function parseJson(value: unknown) {
  if (typeof value !== "string") return value

  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

function isWebMcpResult(value: unknown): value is WebMcpResult {
  if (!value || typeof value !== "object") return false
  const content = (value as { content?: unknown }).content
  if (!Array.isArray(content) || content.length === 0) return false

  return content.every(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as { type?: unknown }).type === "text" &&
      typeof (item as { text?: unknown }).text === "string",
  )
}
