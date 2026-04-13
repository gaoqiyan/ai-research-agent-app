import { auth } from "@/auth";

export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.userId) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session.user.userId;
}
