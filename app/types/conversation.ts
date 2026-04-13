export type TimelineItem = {
  title: string;
  logs: string[];
  done: boolean;
  startTime?: number;
  endTime?: number;
  duration?: number | string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timeline?: TimelineItem[];
  summary?: string;
  keywords?: string[];
  createdAt: number;
};

export type Conversation = {
  id: string;
  messages: Message[];
  status: "idle" | "running" | "completed";
  createdAt: number;
};

export type MemoryItem = {
  id: string;
  summary: string;
  keywords: string[];
  sourceQuery: string;
  createdAt: number;
};
