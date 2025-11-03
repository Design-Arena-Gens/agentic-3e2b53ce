import { NextResponse } from "next/server";
import { generateAgentResponse, AgentPayload } from "@/lib/agent";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AgentPayload;
    const response = generateAgentResponse(body);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Agent error", error);
    return NextResponse.json(
      {
        text:
          "Oops, I hit a snag pulling that up. Mind asking again in a different way?",
        suggestions: ["Show me the menu", "What are the hours?", "Any combos?"],
      },
      { status: 500 }
    );
  }
}
