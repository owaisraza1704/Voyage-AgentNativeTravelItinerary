export type AgentToolCall = {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
}

export type AgentMessage = {
  role: "user" | "assistant" | "tool"
  content: string | null
  tool_calls?: AgentToolCall[]
  tool_call_id?: string
  name?: string
}

export type AgentTool = {
  name: string
  description?: string
  inputSchema?: Record<string, unknown> | string
}

export type AgentResponse = {
  message: AgentMessage
}
