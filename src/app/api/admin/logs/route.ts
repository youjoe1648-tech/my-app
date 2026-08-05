import { NextResponse } from "next/server";
import { getAllUsageLogs } from "@/lib/db";

export async function GET() {
  try {
    const logs = getAllUsageLogs();
    return NextResponse.json({ success: true, logs });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
