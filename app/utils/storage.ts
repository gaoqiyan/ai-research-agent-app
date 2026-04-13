// ============================================================
// localStorage 存储已废弃，对话数据已迁移至 Postgres 后端
// 新的 API 封装见 app/utils/api.ts
// 保留此文件仅供参考，不再被任何组件导入
// ============================================================

// import { Conversation } from "@/app/types/conversation";
//
// const STORAGE_KEY = "ai_history";
//
// export function getAllConversations(): Conversation[] {
//   if (typeof window === "undefined") return [];
//   const raw = localStorage.getItem(STORAGE_KEY);
//   return raw ? JSON.parse(raw) : [];
// }
//
// export function getConversation(id: string): Conversation | undefined {
//   return getAllConversations().find((c) => c.id === id);
// }
//
// export function saveConversation(conversation: Conversation): void {
//   const all = getAllConversations();
//   const idx = all.findIndex((c) => c.id === conversation.id);
//   if (idx >= 0) {
//     all[idx] = conversation;
//   } else {
//     all.unshift(conversation);
//   }
//   localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
// }
//
// export function deleteConversation(id: string): void {
//   const all = getAllConversations().filter((c) => c.id !== id);
//   localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
// }
