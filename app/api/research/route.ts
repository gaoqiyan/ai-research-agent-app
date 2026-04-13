import { runWorkflowStream } from "@/lib/research/workflow";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query, history } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: any) => {
        controller.enqueue(
          encoder.encode(JSON.stringify(data) + "\n")
        );
      };

      await runWorkflowStream(query, send, undefined, history);

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}