"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import Timeline from "@/components/Timeline";
import { Conversation, Message, TimelineItem } from "@/types/conversation";
import { fetchConversation, updateConversation } from "@/utils/api";

export default function ResearchPanel({
  conversationId,
  onUpdate,
}: {
  conversationId: string;
  onUpdate: (conv: Conversation) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [openTimelines, setOpenTimelines] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const convRef = useRef<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing conversation on mount
  useEffect(() => {
    fetchConversation(conversationId).then((existing) => {
      if (existing) {
        convRef.current = existing;
        setMessages(existing.messages);
      }
      setLoading(false);
    });
    return () => {
      abortRef.current?.abort();
    };
  }, [conversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist to DB and notify parent
  const persistUpdate = (
    newMessages: Message[],
    status: Conversation["status"],
  ) => {
    const conv: Conversation = {
      id: conversationId,
      messages: newMessages,
      status,
      createdAt: convRef.current?.createdAt || Date.now(),
    };
    convRef.current = conv;

    // 仅在完成/空闲时写入数据库
    if (status === "completed" || status === "idle") {
      updateConversation(conv);
      onUpdate(conv);
    }
  };

  // Live timer for in-progress steps
  useEffect(() => {
    if (!isStreaming) return;
    const timer = setInterval(() => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant" || !last.timeline) return prev;

        const updatedTimeline = last.timeline.map((item) => {
          if (!item.done && item.startTime) {
            return {
              ...item,
              duration: ((Date.now() - item.startTime) / 1000).toFixed(1),
            };
          }
          return item;
        });

        const updated = [...prev];
        updated[updated.length - 1] = { ...last, timeline: updatedTimeline };
        return updated;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isStreaming]);

  const toggleTimeline = (msgId: string) => {
    setOpenTimelines((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const queryText = input.trim();

    // Create user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: queryText,
      createdAt: Date.now(),
    };

    // Create empty assistant message
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timeline: [],
      createdAt: Date.now(),
    };

    const newMessages = [...messages, userMsg, assistantMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    setOpenTimelines((prev) => new Set([...prev, assistantMsg.id]));

    const controller = new AbortController();
    abortRef.current = controller;

    persistUpdate(newMessages, "running");

    try {
      // Build history from previous completed Q&A pairs
      const history: { query: string; summary: string }[] = [];
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === "user" && messages[i + 1]?.role === "assistant") {
          const assistantContent = messages[i + 1].content;
          if (assistantContent) {
            history.push({
              query: msg.content,
              summary: messages[i + 1].summary || assistantContent.slice(0, 300),
            });
          }
        }
      }

      // // Load memories (跨对话记忆已禁用)
      // const memories = getAllMemories().map((m) => ({
      //   summary: m.summary,
      //   keywords: m.keywords,
      // }));

      const res = await fetch("/api/research", {
        method: "POST",
        body: JSON.stringify({ query: queryText, history }),
        signal: controller.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentTimeline: TimelineItem[] = [];
      let currentResult = "";

      // Track the current messages state for updates
      let latestMessages = newMessages;

      const updateAssistantMsg = (timeline: TimelineItem[], content: string, extra?: { summary?: string; keywords?: string[] }) => {
        const updated = [...latestMessages];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          timeline: [...timeline],
          content,
          ...extra,
        };
        latestMessages = updated;
        setMessages(updated);
        return updated;
      };

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        buffer += decoder.decode(value);
        const lines = buffer.split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);

            if (data.type === "step") {
              currentTimeline = [
                ...currentTimeline,
                {
                  title: data.message,
                  logs: [],
                  done: false,
                  startTime: Date.now(),
                },
              ];
              const updated = updateAssistantMsg(currentTimeline, currentResult);
              persistUpdate(updated, "running");
            }

            if (data.type === "search") {
              currentTimeline = currentTimeline.map((item, idx) =>
                idx === data.step
                  ? { ...item, logs: [...item.logs, data.message] }
                  : item,
              );
              const updated = updateAssistantMsg(currentTimeline, currentResult);
              persistUpdate(updated, "running");
            }

            if (data.type === "done") {
              currentTimeline = currentTimeline.map((item, idx) =>
                idx === data.step
                  ? {
                      ...item,
                      done: true,
                      endTime: Date.now(),
                      duration: ((Date.now() - (item.startTime || Date.now())) / 1000).toFixed(1),
                    }
                  : item,
              );
              const updated = updateAssistantMsg(currentTimeline, currentResult);
              persistUpdate(updated, "running");
            }

            if (data.type === "final") {
              currentResult = data.content;
              const updated = updateAssistantMsg(currentTimeline, currentResult);
              persistUpdate(updated, "running");
            }

            if (data.type === "summary") {
              const updated = updateAssistantMsg(currentTimeline, currentResult, {
                summary: data.summary,
                keywords: data.keywords,
              });
              persistUpdate(updated, "running");
            }

            // // 跨对话记忆已禁用
            // if (data.type === "memories") {
            //   const newMemory: MemoryItem = {
            //     id: crypto.randomUUID(),
            //     summary: data.item.summary,
            //     keywords: data.item.keywords,
            //     sourceQuery: data.query,
            //     createdAt: Date.now(),
            //   };
            //   saveMemories([newMemory]);
            // }
          } catch (e) {}
        }

        buffer = lines[lines.length - 1];
      }

      setIsStreaming(false);
      persistUpdate(latestMessages, "completed");
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setIsStreaming(false);
      persistUpdate(
        convRef.current?.messages || newMessages,
        "completed",
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-2xl font-bold mb-6">AI 研究助手</h1>

        {messages.length === 0 && !isStreaming && !loading && (
          <p className="text-gray-400 text-center mt-20">输入问题开始研究</p>
        )}

        {loading && (
          <p className="text-gray-400 text-center mt-20">加载中...</p>
        )}

        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-blue-500 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%] text-sm">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-full w-full">
                  {/* Timeline */}
                  {msg.timeline && msg.timeline.length > 0 && (
                    <>
                      <button
                        onClick={() => toggleTimeline(msg.id)}
                        className="text-sm text-blue-500 hover:text-blue-600 mb-2"
                      >
                        {openTimelines.has(msg.id) ? "收起日志" : "展开日志"}
                      </button>
                      {openTimelines.has(msg.id) && (
                        <Timeline data={msg.timeline} />
                      )}
                    </>
                  )}

                  {/* Result */}
                  {msg.content ? (
                    <div className="mt-4 prose prose-gray max-w-none prose-headings:text-gray-800 prose-p:text-gray-600 prose-a:text-blue-500">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.timeline &&
                    msg.timeline.length === 0 && (
                      <div className="text-gray-400 text-sm animate-pulse">
                        正在分析...
                      </div>
                    )
                  )}
                </div>
              </div>
            ),
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="输入你的问题..."
            disabled={isStreaming}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isStreaming ? "分析中..." : "发送"}
          </button>
        </div>
      </div>
    </div>
  );
}
