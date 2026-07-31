import { NextResponse } from 'next/server';
import { getDb, resetDbToDefault } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const db = getDb();

  if (userId) {
    // Find logs associated with tickets of this user
    const userTickets = db.tickets.filter(t => t.user_id === userId);
    const ticketIds = userTickets.map(t => t.id);
    const userLogs = db.logs.filter(l => ticketIds.includes(l.ticket_id));

    return NextResponse.json({ success: true, logs: userLogs });
  }

  // Admin logs (all)
  return NextResponse.json({ success: true, logs: db.logs });
}

// Add a POST or DELETE endpoint to clear/reset the db for testing purposes
export async function DELETE() {
  try {
    resetDbToDefault();
    return NextResponse.json({ success: true, message: 'Database reset successfully' });
  } catch (error) {
    console.error('Failed to reset database:', error);
    return NextResponse.json({ success: false, message: 'Failed to reset database' }, { status: 500 });
  }
}
