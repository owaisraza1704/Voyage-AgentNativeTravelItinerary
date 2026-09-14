import { NextResponse } from "next/server"
import { AzureOpenAI } from "openai"
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions"
import type { AgentMessage, AgentTool } from "@/lib/agent-types"

const SYSTEM_PROMPT = `You are Voyage, a concise travel planning assistant.

Use the supplied Voyage tools to update the user's trip and retrieve travel information. Prefer reading the current trip context before making assumptions. Never claim that a booking or cancellation happened unless the tool result confirms it.

For booking and cancellation, first show the user the relevant summary and ask for explicit confirmation. Do not call book_itinerary or cancel_booking unless the user has clearly confirmed that specific action.`

function getAzureClient() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const deployment = process.env.MODEL_DEPLOYMENT
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION ??
    process.env.OPENAI_API_VERSION ??
    "2024-10-21"

  if (!apiKey || !endpoint || !deployment) {
    throw new Error(
      "Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and MODEL_DEPLOYMENT.",
    )
  }

  return new AzureOpenAI({ apiKey, endpoint, deployment, apiVersion })
}

function normalizeInputSchema(schema: AgentTool["inputSchema"]) {
  if (!schema) return { type: "object", properties: {} }
  if (typeof schema !== "string") return schema

  try {
    const parsed = JSON.parse(schema) as unknown
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : { type: "object", properties: {} }
  } catch {
    return { type: "object", properties: {} }
  }
}

function toOpenAiTools(tools: AgentTool[]): ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description ?? `Use the Voyage ${tool.name} tool.`,
      parameters: normalizeInputSchema(tool.inputSchema),
    },
  }))
}

function toOpenAiMessages(messages: AgentMessage[]): ChatCompletionMessageParam[] {
  return messages.map((message) => {
    if (message.role === "tool") {
      return {
        role: "tool",
        content: message.content ?? "",
        tool_call_id: message.tool_call_id ?? "",
        ...(message.name ? { name: message.name } : {}),
      }
    }

    if (message.role === "assistant") {
      return {
        role: "assistant",
        content: message.content,
        ...(message.tool_calls ? { tool_calls: message.tool_calls } : {}),
      }
    }

    return { role: "user", content: message.content ?? "" }
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages?: AgentMessage[]
      tools?: AgentTool[]
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "At least one agent message is required." },
        { status: 400 },
      )
    }

    const client = getAzureClient()
    const deployment = process.env.MODEL_DEPLOYMENT as string
    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...toOpenAiMessages(body.messages),
      ],
      tools: toOpenAiTools(body.tools ?? []),
      tool_choice: "auto",
    })

    const message = response.choices[0]?.message
    if (!message) {
      return NextResponse.json(
        { error: "Azure OpenAI returned no assistant message." },
        { status: 502 },
      )
    }

    return NextResponse.json({
      message: {
        role: "assistant",
        content: message.content,
        tool_calls: message.tool_calls,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Agent request failed."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
