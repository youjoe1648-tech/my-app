import fs from 'fs';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'admin';
}

export interface Ticket {
  id: string;
  user_id: string;
  total_slots: number; // usually 33
  remaining_slots: number;
  status: 'active' | 'exhausted';
  purchased_at: string; // ISO string
}

export interface UsageLog {
  id: string;
  ticket_id: string;
  used_slots: number;
  used_at: string; // ISO string
  user_name?: string; // Cache user info for admin log view
  user_email?: string;
}

export interface DatabaseSchema {
  users: User[];
  tickets: Ticket[];
  logs: UsageLog[];
}

const DB_FILE_PATH = '/tmp/database.json';

const defaultData: DatabaseSchema = {
  users: [
    { id: 'usr-1', name: '田中 太郎', email: 'member1@example.com', role: 'member' },
    { id: 'usr-2', name: '佐藤 花子', email: 'member2@example.com', role: 'member' },
    { id: 'usr-admin', name: '管理者 A', email: 'admin@example.com', role: 'admin' },
  ],
  tickets: [
    {
      id: 'tkt-1',
      user_id: 'usr-1',
      total_slots: 33,
      remaining_slots: 25,
      status: 'active',
      purchased_at: '2026-08-01T10:00:00.000Z',
    },
    {
      id: 'tkt-2',
      user_id: 'usr-2',
      total_slots: 33,
      remaining_slots: 33,
      status: 'active',
      purchased_at: '2026-08-02T11:30:00.000Z',
    },
  ],
  logs: [
    {
      id: 'log-1',
      ticket_id: 'tkt-1',
      used_slots: 5,
      used_at: '2026-08-01T14:00:00.000Z',
      user_name: '田中 太郎',
      user_email: 'member1@example.com',
    },
    {
      id: 'log-2',
      ticket_id: 'tkt-1',
      used_slots: 3,
      used_at: '2026-08-02T09:15:00.000Z',
      user_name: '田中 太郎',
      user_email: 'member1@example.com',
    },
  ],
};

// In-memory fallback if file operations fail
let inMemoryDb: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    } else {
      // Initialize file database
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
  } catch (error) {
    console.warn('Failed to read from file database, falling back to in-memory store:', error);
    if (!inMemoryDb) {
      inMemoryDb = JSON.parse(JSON.stringify(defaultData));
    }
    return inMemoryDb!;
  }
}

export function saveDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Failed to write to file database, saving to in-memory store:', error);
  }
  inMemoryDb = data;
}

export function resetDbToDefault(): void {
  saveDb(JSON.parse(JSON.stringify(defaultData)));
}
