import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function createResetToken(email: string): string {
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
  const payload = `${email}:${expires}`;
  const secret = process.env.AUTH_SECRET!;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export { createResetToken };

export async function POST(req: Request) {
  const { email, securityAnswer } = await req.json();

  if (!email || !securityAnswer) {
    return Response.json({ error: "缺少必填字段" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return Response.json({ error: "该邮箱未注册" }, { status: 404 });
  }

  const match = await bcrypt.compare(
    securityAnswer.trim().toLowerCase(),
    user.securityAnswer,
  );

  if (!match) {
    return Response.json({ error: "密保答案不正确" }, { status: 401 });
  }

  const token = createResetToken(email);

  return Response.json({ token });
}
