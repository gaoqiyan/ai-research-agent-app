import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const DEFAULT_USER_ID = "default_user";

// 确保默认用户存在
async function ensureDefaultUser() {
  await prisma.user.upsert({
    where: { userId: DEFAULT_USER_ID },
    update: {},
    create: { userId: DEFAULT_USER_ID, name: "默认用户" },
  });
}

// GET /api/conversations — 获取对话列表（含 messages）
export async function GET() {
  await ensureDefaultUser();

  const conversations = await prisma.conversation.findMany({
    where: { userId: DEFAULT_USER_ID },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(
    conversations.map((c) => ({
      id: c.convId,
      status: c.status,
      createdAt: c.createdAt.getTime(),
      messages: c.messages.map((m) => ({
        id: m.msgId,
        role: m.role,
        content: m.content,
        timeline: m.timeline ?? undefined,
        summary: m.summary ?? undefined,
        keywords: m.keywords.length > 0 ? m.keywords : undefined,
        createdAt: m.createdAt.getTime(),
      })),
    })),
  );
}

// POST /api/conversations — 新建对话
export async function POST(req: NextRequest) {
  await ensureDefaultUser();

  const body = await req.json();
  const { id, status, createdAt } = body;

  await prisma.conversation.create({
    data: {
      convId: id,
      userId: DEFAULT_USER_ID,
      status: status || "idle",
      createdAt: new Date(createdAt),
    },
  });

  return Response.json({ ok: true });
}
