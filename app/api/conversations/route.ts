import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";

// GET /api/conversations — 获取对话列表（含 messages）
export async function GET() {
  const session = await auth();
  if (!session?.user?.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.userId },
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
  const session = await auth();
  if (!session?.user?.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, status, createdAt } = body;

  await prisma.conversation.create({
    data: {
      convId: id,
      userId: session.user.userId,
      status: status || "idle",
      createdAt: new Date(createdAt),
    },
  });

  return Response.json({ ok: true });
}
