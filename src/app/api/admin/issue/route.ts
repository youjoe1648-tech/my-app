import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, slots } = body;

    const totalSlots = slots ? parseInt(slots, 10) : 33;

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    const db = getDb();
    let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // If user does not exist, let's create a placeholder user so we can issue a ticket.
      const nameFromEmail = email.split('@')[0];
      user = {
        id: `usr-${Date.now()}`,
        name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
        email: email.toLowerCase(),
        role: 'member',
      };
      db.users.push(user);
    }

    // Set any existing tickets for this user to exhausted or keep them?
    // Usually, we keep multiple, but typically we can have one active and some exhausted,
    // or just stack them. Let's stack them as separate active tickets.
    const newTicket = {
      id: `tkt-${Date.now()}`,
      user_id: user.id,
      total_slots: totalSlots,
      remaining_slots: totalSlots,
      status: 'active' as const,
      purchased_at: new Date().toISOString(),
    };

    db.tickets.unshift(newTicket);
    saveDb(db);

    return NextResponse.json({
      success: true,
      ticket: newTicket,
      user,
      message: `${user.name}様に新たに ${totalSlots} 枠 of 回数券を付与しました。`,
    });
  } catch (error) {
    console.error('Issue ticket error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
