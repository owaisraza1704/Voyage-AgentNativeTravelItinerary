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

export type RegisteredWebMcpTool = {
  name: string
  description?: string
  inputSchema?: Record<string, unknown> | string
}

export type ModelContext = {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<void>
  getTools?: () => Promise<RegisteredWebMcpTool[]>
  executeTool?: (
    tool: RegisteredWebMcpTool,
    input: Record<string, unknown> | string,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown>
}

declare global {
  interface Document {
    modelContext?: ModelContext
  }
}
