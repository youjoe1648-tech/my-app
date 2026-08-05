import { NextResponse } from "next/server";
import { getUsers } from "@/lib/db";

export async function GET() {
  try {
    const users = getUsers();
    return NextResponse.json({ success: true, users });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
