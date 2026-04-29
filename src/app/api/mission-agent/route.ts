import { runMissionAgent } from "@/lib/mission-agent/graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body.prompt !== "string" || !body.context || !Array.isArray(body.messages)) {
      return Response.json(
        { error: "Invalid mission-agent request body." },
        { status: 400 },
      );
    }

    const result = await runMissionAgent({
      prompt: body.prompt,
      messages: body.messages,
      context: body.context,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Mission agent failed with an unknown error.",
      },
      { status: 500 },
    );
  }
}
