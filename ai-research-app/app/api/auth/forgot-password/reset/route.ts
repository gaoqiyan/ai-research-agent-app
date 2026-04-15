import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";

function verifyResetToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const [email, expiresStr, signature] = decoded.split(":");
    const secret = process.env.AUTH_SECRET!;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${email}:${expiresStr}`)
      .digest("hex");
    if (signature !== expectedSig) return null;
    if (Date.now() > Number(expiresStr)) return null;
    return email;
  } catch {
    return null;
  }
}

const resetSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(6, "密码至少6位"),
  token: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = resetSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { email, newPassword, token } = parsed.data;

  const tokenEmail = verifyResetToken(token);
  if (!tokenEmail || tokenEmail !== email) {
    return Response.json({ error: "验证令牌已过期或无效" }, { status: 401 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  return Response.json({ ok: true });
}
