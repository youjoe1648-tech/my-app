import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticketId, slots } = body;

    const usedSlots = parseInt(slots, 10);
    if (!ticketId || isNaN(usedSlots) || usedSlots <= 0 || usedSlots > 5) {
      return NextResponse.json({ success: false, message: 'Invalid ticket ID or slots count (must be between 1 and 5)' }, { status: 400 });
    }

    const db = getDb();
    const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);

    if (ticketIndex === -1) {
      return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404 });
    }

    const ticket = db.tickets[ticketIndex];

    if (ticket.status !== 'active' || ticket.remaining_slots <= 0) {
      return NextResponse.json({ success: false, message: 'Ticket is already exhausted or inactive' }, { status: 400 });
    }

    if (ticket.remaining_slots < usedSlots) {
      return NextResponse.json({ success: false, message: `Not enough slots remaining. (Only ${ticket.remaining_slots} left)` }, { status: 400 });
    }

    // Deduct slots
    ticket.remaining_slots -= usedSlots;
    if (ticket.remaining_slots === 0) {
      ticket.status = 'exhausted';
    }

    // Find user to attach info to log
    const user = db.users.find(u => u.id === ticket.user_id);

    // Create log
    const logId = `log-${Date.now()}`;
    const newLog = {
      id: logId,
      ticket_id: ticketId,
      used_slots: usedSlots,
      used_at: new Date().toISOString(),
      user_name: user?.name || 'Unknown',
      user_email: user?.email || 'Unknown',
    };

    db.logs.unshift(newLog); // Put new logs first
    saveDb(db);

    return NextResponse.json({
      success: true,
      ticket,
      log: newLog,
      message: `${usedSlots}枠を正常に消費しました。`,
    });
  } catch (error) {
    console.error('Consume ticket error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
