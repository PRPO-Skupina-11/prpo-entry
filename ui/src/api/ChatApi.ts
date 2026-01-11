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

export type ChatSummary = {
  id: string;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
  lastProviderId?: string | null;
  lastModelId?: string | null;
};

export type ListChatsResponse = {
  items: ChatSummary[];
  total?: number | null;
  nextCursor?: string | null;
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function createChat(token: string): Promise<CreateChatResponse> {
  const r = await fetch("/api/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: "{}",
  });

  if (!r.ok) throw new Error(`createChat failed: ${r.status}`);
  return r.json();
}

export async function getChat(token: string, conversationId: string) {
  const r = await fetch(`/api/v1/chat/${encodeURIComponent(conversationId)}`, {
    headers: {
      ...authHeaders(token),
    },
  });

  if (!r.ok) throw new Error(`getChat failed: ${r.status}`);
  return r.json();
}

export async function sendMessage(
  token: string,
  conversationId: string,
  content: string,
  forceProviderId?: string | null,
  forceModelId?: string | null
): Promise<SendMessageResponse> {
  const body: any = { content }

  if (forceProviderId || forceModelId) {
    body.modelOverrides = {
      forceProviderId: forceProviderId ?? null,
      forceModelId: forceModelId ?? null,
    }
  }

  const r = await fetch(`/api/v1/chat/${encodeURIComponent(conversationId)}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) throw new Error(`sendMessage failed: ${r.status}`);
  return r.json();
}

export async function listChats(token: string, limit = 50, cursor?: string | null): Promise<ListChatsResponse> {
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  if (cursor) qs.set("cursor", cursor);

  const r = await fetch(`/api/v1/chat?${qs.toString()}`, {
    headers: {
      ...authHeaders(token),
    },
  });

  if (!r.ok) throw new Error(`listChats failed: ${r.status}`);
  return r.json();
}

export async function deleteChat(token: string, conversationId: string) {
  const r = await fetch(`/api/v1/chat/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(token),
    },
  });

  if (!r.ok) throw new Error(`deleteChat failed: ${r.status}`);
}
