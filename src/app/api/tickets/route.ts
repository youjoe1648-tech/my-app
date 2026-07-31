import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const db = getDb();

  if (userId) {
    // Find all active tickets for the user
    const userTickets = db.tickets.filter(t => t.user_id === userId);
    return NextResponse.json({ success: true, tickets: userTickets });
  }

  // Admin view or all tickets
  return NextResponse.json({ success: true, tickets: db.tickets });
}
