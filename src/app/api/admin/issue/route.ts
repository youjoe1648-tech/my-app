import { NextResponse } from "next/server";
import { issueTicket } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { target } = body;

    if (!target) {
      return NextResponse.json({ success: false, error: "target (ID or Email) is required" }, { status: 400 });
    }

    const result = issueTicket(target);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
