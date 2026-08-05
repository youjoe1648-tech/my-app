import { NextResponse } from "next/server";
import { getTickets, getUsageLogs, consumeTicket } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const tickets = getTickets(userId);

    // Fetch logs for all tickets belonging to this user
    const logs = tickets.flatMap(ticket => getUsageLogs(ticket.id))
      .sort((a, b) => b.used_at.localeCompare(a.used_at));

    return NextResponse.json({ success: true, tickets, logs });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, slots } = body;

    if (!userId || typeof slots !== "number") {
      return NextResponse.json({ success: false, error: "userId and slots (number) are required" }, { status: 400 });
    }

    const result = consumeTicket(userId, slots);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
