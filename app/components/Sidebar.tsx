"use client";

import { Conversation } from "@/app/types/conversation";
import ConversationItem from "./ConversationItem";

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewConversation,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="w-64 h-screen flex flex-col border-r border-gray-200 bg-white flex-shrink-0">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">历史对话</h2>
        <button
          onClick={onNewConversation}
          className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          新对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">暂无对话记录</p>
        )}
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === activeId}
            onClick={() => onSelect(conv.id)}
            onDelete={() => onDelete(conv.id)}
          />
        ))}
      </div>
    </aside>
  );
}
