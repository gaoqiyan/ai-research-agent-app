import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/conversations/:id — 获取单个对话
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const conv = await prisma.conversation.findUnique({
    where: { convId: id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conv) {
    return Response.json(null, { status: 404 });
  }

  return Response.json({
    id: conv.convId,
    status: conv.status,
    createdAt: conv.createdAt.getTime(),
    messages: conv.messages.map((m) => ({
      id: m.msgId,
      role: m.role,
      content: m.content,
      timeline: m.timeline ?? undefined,
      summary: m.summary ?? undefined,
      keywords: m.keywords.length > 0 ? m.keywords : undefined,
      createdAt: m.createdAt.getTime(),
    })),
  });
}

// PUT /api/conversations/:id — 更新对话（status + 全量 messages 替换）
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, messages } = body;

  // 使用事务：删除旧 messages + 插入新 messages，防止并发导致重复
  await prisma.$transaction(async (tx) => {
    await tx.conversation.update({
      where: { convId: id },
      data: { status },
    });

    await tx.message.deleteMany({
      where: { conversationId: id },
    });

    if (messages && messages.length > 0) {
      await tx.message.createMany({
        data: messages.map((m: any) => ({
          msgId: m.id,
          conversationId: id,
          role: m.role,
          content: m.content || "",
          timeline: m.timeline ?? null,
          summary: m.summary ?? null,
          keywords: m.keywords ?? [],
          createdAt: new Date(m.createdAt),
        })),
      });
    }
  });

  return Response.json({ ok: true });
}

// DELETE /api/conversations/:id — 删除对话及其 messages
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // 先删 messages，再删 conversation（MongoDB 无 CASCADE）
  await prisma.message.deleteMany({ where: { conversationId: id } });
  await prisma.conversation.delete({ where: { convId: id } });

  return Response.json({ ok: true });
}
