import { Conversation } from "@/types/conversation";

async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  return res;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await authFetch("/api/conversations");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchConversation(id: string): Promise<Conversation | null> {
  const res = await authFetch(`/api/conversations/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createConversation(conv: Conversation): Promise<void> {
  await authFetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: conv.id,
      status: conv.status,
      createdAt: conv.createdAt,
    }),
  });
}

export async function updateConversation(conv: Conversation): Promise<void> {
  await authFetch(`/api/conversations/${conv.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: conv.status,
      messages: conv.messages,
    }),
  });
}

export async function removeConversation(id: string): Promise<void> {
  await authFetch(`/api/conversations/${id}`, {
    method: "DELETE",
  });
}
