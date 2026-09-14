export type WebMcpResult = {
  content: Array<{
    type: "text"
    text: string
  }>
}

export type WebMcpTool = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (input: unknown) => WebMcpResult | Promise<WebMcpResult>
}

export type ModelContext = {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<void>
}

declare global {
  interface Document {
    modelContext?: ModelContext
  }
}

