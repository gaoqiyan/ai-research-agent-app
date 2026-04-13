"use client";

import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import ResearchPanel from "./components/ResearchPanel";
import EmptyState from "./components/EmptyState";
import { Conversation } from "@/app/types/conversation";
import {
  fetchConversations,
  createConversation,
  removeConversation,
} from "@/app/utils/api";

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchConversations().then((data) => {
      if (!cancelled) setConversations(data);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleNewConversation = async () => {
    const conv: Conversation = {
      id: crypto.randomUUID(),
      messages: [],
      status: "idle",
      createdAt: Date.now(),
    };
    await createConversation(conv);
    setConversations((prev) => {
      // 防止重复
      if (prev.some((c) => c.id === conv.id)) return prev;
      return [conv, ...prev];
    });
    setActiveId(conv.id);
  };

  const handleConversationUpdate = (updated: Conversation) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      if (exists) {
        return prev.map((c) => (c.id === updated.id ? updated : c));
      }
      // 对话不在列表中（首次完成时），添加到列表
      return [updated, ...prev];
    });
  };

  const handleDelete = async (id: string) => {
    await removeConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNewConversation={handleNewConversation}
        onDelete={handleDelete}
      />
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            加载中...
          </div>
        ) : activeId ? (
          <ResearchPanel
            key={activeId}
            conversationId={activeId}
            onUpdate={handleConversationUpdate}
          />
        ) : (
          <EmptyState onNewConversation={handleNewConversation} />
        )}
      </main>
    </div>
  );
}
