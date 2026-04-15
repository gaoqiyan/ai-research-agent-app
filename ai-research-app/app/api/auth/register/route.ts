import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "请输入姓名"),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少6位"),
  securityQuestion: z.string().min(1, "请选择密保问题"),
  securityAnswer: z.string().min(1, "请输入密保答案"),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { name, email, password, securityQuestion, securityAnswer } =
    parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "该邮箱已注册" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const hashedAnswer = await bcrypt.hash(
    securityAnswer.trim().toLowerCase(),
    10,
  );

  await prisma.user.create({
    data: {
      userId: email,
      name,
      email,
      password: hashedPassword,
      securityQuestion,
      securityAnswer: hashedAnswer,
    },
  });

  return Response.json({ ok: true }, { status: 201 });
}
