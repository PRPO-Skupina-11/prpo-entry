export type MessageRole = "user" | "assistant" | "system";

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  providerId?: string | null;
  modelId?: string | null;
  requestId?: string | null;
};

export type CreateChatResponse = {
  id: string;
  title?: string | null;
  createdAt: string;
};

export type SendMessageResponse = {
  conversationId: string;
  userMessage: Message;
  assistantMessage: Message;
  routing: {
    requestId: string;
    providerId: string;
    modelId: string;
    latencyMs?: number | null;
    promptTokens?: number | null;
    completionTokens?: number | null;
    totalTokens?: number | null;
    cost?: number | null;
    currency?: string | null;
  };
};

export async function createChat() {
  const r = await fetch("/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });

  if (!r.ok) throw new Error(`createChat failed: ${r.status}`);
  return r.json();
}

export async function getChat(conversationId: string) {
  const r = await fetch(`/api/v1/chat/${encodeURIComponent(conversationId)}`);
  if (!r.ok) throw new Error(`getChat failed: ${r.status}`);
  return r.json();
}

export async function sendMessage(conversationId: string, content: string) {
  const r = await fetch(`/api/v1/chat/${encodeURIComponent(conversationId)}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });

  if (!r.ok) throw new Error(`sendMessage failed: ${r.status}`);
  return r.json();
}
