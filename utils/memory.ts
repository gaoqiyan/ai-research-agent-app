import { MemoryItem } from "@/types/conversation";

const MEMORY_KEY = "ai_memories";

export function getAllMemories(): MemoryItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(MEMORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveMemories(items: MemoryItem[]): void {
  const all = getAllMemories();
  all.unshift(...items);
  localStorage.setItem(MEMORY_KEY, JSON.stringify(all));
}

export function clearMemories(): void {
  localStorage.removeItem(MEMORY_KEY);
}
