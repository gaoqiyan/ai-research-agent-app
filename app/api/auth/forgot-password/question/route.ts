import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return Response.json({ error: "请输入邮箱" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { securityQuestion: true },
  });

  if (!user) {
    return Response.json({ error: "该邮箱未注册" }, { status: 404 });
  }

  return Response.json({ securityQuestion: user.securityQuestion });
}
