import { runWorkflowStream } from "@/lib/workflow";

export async function POST(req: Request) {
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