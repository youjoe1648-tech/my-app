import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  const db = getDb();

  if (email) {
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      return NextResponse.json({ success: true, user });
    }
    return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, users: db.users });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, role } = body;

    if (!email || !name) {
      return NextResponse.json({ success: false, message: 'Email and name are required' }, { status: 400 });
    }

    const db = getDb();
    const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      // Just log in/return existing user
      return NextResponse.json({ success: true, user: existingUser, message: 'Logged in successfully' });
    }

    // Register new user
    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      role: role || 'member',
    };

    db.users.push(newUser);
    saveDb(db);

    return NextResponse.json({ success: true, user: newUser, message: 'Registered and logged in successfully' });
  } catch (error) {
    console.error('Auth route error:', error);
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
  }
}
