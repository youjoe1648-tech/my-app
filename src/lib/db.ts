export interface User {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
}

export interface Ticket {
  id: number;
  user_id: string;
  total_slots: number;
  remaining_slots: number;
  status: "active" | "exhausted";
  purchased_at: string;
}

export interface UsageLog {
  id: number;
  ticket_id: number;
  used_slots: number;
  used_at: string;
  user_name?: string;
  user_email?: string;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
let db: any = null;
let isMock = false;

// Seed initial mock state for fallback mode
const mockUsers: User[] = [
  { id: "yamada-1", name: "山田 太郎", email: "yamada@example.com", role: "member" },
  { id: "sato-1", name: "佐藤 花子", email: "sato@example.com", role: "member" },
  { id: "admin-1", name: "店舗管理者", email: "admin@example.com", role: "admin" },
];

const mockTickets: Ticket[] = [
  {
    id: 1,
    user_id: "yamada-1",
    total_slots: 33,
    remaining_slots: 32,
    status: "active",
    purchased_at: "2026-07-31 05:00:00",
  }
];

const mockUsageLogs: UsageLog[] = [
  {
    id: 1,
    ticket_id: 1,
    used_slots: 1,
    used_at: "2026-07-31 05:21:00",
  }
];

// Initialize database
function initDatabase() {
  try {
    const requireFunc = typeof require !== "undefined" ? require : null;
    if (!requireFunc) {
      console.warn("Require is not defined. Falling back to mock database.");
      isMock = true;
      return;
    }

    let DatabaseConstructor;
    try {
      DatabaseConstructor = requireFunc("better-sqlite3");
    } catch {
      console.warn("better-sqlite3 module loading failed. Falling back to mock database.");
      isMock = true;
      return;
    }

    // Determine path
    let dbPath = "database.db";
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      dbPath = "/tmp/database.db";
    }

    db = new DatabaseConstructor(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        total_slots INTEGER NOT NULL,
        remaining_slots INTEGER NOT NULL,
        status TEXT NOT NULL,
        purchased_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        used_slots INTEGER NOT NULL,
        used_at TEXT NOT NULL,
        FOREIGN KEY(ticket_id) REFERENCES tickets(id)
      );
    `);

    // Seed data if empty
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    if (userCount === 0) {
      const insertUser = db.prepare("INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)");
      insertUser.run("yamada-1", "山田 太郎", "yamada@example.com", "member");
      insertUser.run("sato-1", "佐藤 花子", "sato@example.com", "member");
      insertUser.run("admin-1", "店舗管理者", "admin@example.com", "admin");

      db.exec(`
        INSERT INTO tickets (id, user_id, total_slots, remaining_slots, status, purchased_at)
        VALUES (1, 'yamada-1', 33, 32, 'active', '2026-07-31 05:00:00');

        INSERT INTO usage_logs (id, ticket_id, used_slots, used_at)
        VALUES (1, 1, 1, '2026-07-31 05:21:00');
      `);
    }

    console.log(`Database successfully initialized at ${dbPath}`);
  } catch (err) {
    console.error("SQLite initialization failed. Using in-memory fallback.", err);
    isMock = true;
  }
}

// Perform initialization
initDatabase();

export function isUsingMock(): boolean {
  return isMock;
}

export function getUsers(): User[] {
  if (isMock) {
    return mockUsers;
  }
  return db.prepare("SELECT * FROM users").all() as User[];
}

export function getTickets(userId: string): Ticket[] {
  if (isMock) {
    return mockTickets.filter(t => t.user_id === userId);
  }
  return db.prepare("SELECT * FROM tickets WHERE user_id = ?").all(userId) as Ticket[];
}

export function getUsageLogs(ticketId: number): UsageLog[] {
  if (isMock) {
    return mockUsageLogs.filter(l => l.ticket_id === ticketId);
  }
  return db.prepare("SELECT * FROM usage_logs WHERE ticket_id = ? ORDER BY used_at DESC").all(ticketId) as UsageLog[];
}

export function getAllUsageLogs(): UsageLog[] {
  if (isMock) {
    return mockUsageLogs.map(log => {
      const ticket = mockTickets.find(t => t.id === log.ticket_id);
      const user = ticket ? mockUsers.find(u => u.id === ticket.user_id) : null;
      return {
        ...log,
        user_name: user?.name || "不明",
        user_email: user?.email || "",
      };
    }).sort((a, b) => b.used_at.localeCompare(a.used_at));
  }

  return db.prepare(`
    SELECT l.*, u.name as user_name, u.email as user_email
    FROM usage_logs l
    JOIN tickets t ON l.ticket_id = t.id
    JOIN users u ON t.user_id = u.id
    ORDER BY l.used_at DESC
  `).all() as UsageLog[];
}

export function consumeTicket(userId: string, slots: number): { success: boolean; message: string } {
  if (slots < 1 || slots > 5) {
    return { success: false, message: "1度に消費できる枠数は1〜5枠です。" };
  }

  const nowStr = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
    .replace(/\//g, "-"); // Format nicely to YYYY-MM-DD HH:MM:SS

  if (isMock) {
    // Find active ticket with remaining slots
    const activeTicket = mockTickets.find(t => t.user_id === userId && t.status === "active" && t.remaining_slots > 0);
    if (!activeTicket) {
      return { success: false, message: "有効な回数券がありません。" };
    }

    if (activeTicket.remaining_slots < slots) {
      return { success: false, message: `残枠数が足りません（残り ${activeTicket.remaining_slots} 枠）。` };
    }

    activeTicket.remaining_slots -= slots;
    if (activeTicket.remaining_slots === 0) {
      activeTicket.status = "exhausted";
    }

    const newLogId = mockUsageLogs.length + 1;
    mockUsageLogs.push({
      id: newLogId,
      ticket_id: activeTicket.id,
      used_slots: slots,
      used_at: nowStr,
    });

    return { success: true, message: `${slots}枠を消費しました。` };
  }

  // SQLite transaction
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const executeTransaction = db.transaction(() => {
    const activeTicket = db.prepare("SELECT * FROM tickets WHERE user_id = ? AND status = 'active' AND remaining_slots > 0").get(userId) as Ticket | undefined;
    if (!activeTicket) {
      throw new Error("有効な回数券がありません。");
    }

    if (activeTicket.remaining_slots < slots) {
      throw new Error(`残枠数が足りません（残り ${activeTicket.remaining_slots} 枠）。`);
    }

    const nextRemaining = activeTicket.remaining_slots - slots;
    const nextStatus = nextRemaining === 0 ? "exhausted" : "active";

    db.prepare("UPDATE tickets SET remaining_slots = ?, status = ? WHERE id = ?")
      .run(nextRemaining, nextStatus, activeTicket.id);

    db.prepare("INSERT INTO usage_logs (ticket_id, used_slots, used_at) VALUES (?, ?, ?)")
      .run(activeTicket.id, slots, nowStr);
  });

  try {
    executeTransaction();
    return { success: true, message: `${slots}枠を消費しました。` };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "エラーが発生しました。";
    return { success: false, message: errMsg };
  }
}

export function issueTicket(target: string): { success: boolean; message: string } {
  const nowStr = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
    .replace(/\//g, "-");

  if (isMock) {
    const user = mockUsers.find(u => u.id === target || u.email === target);
    if (!user) {
      return { success: false, message: "該当する会員が見つかりません。" };
    }

    // Set any existing active tickets for this user to exhausted or keep them?
    // Usually, we can have multiple active tickets or just add to the pile.
    // The requirement says: "管理者 会員ID/メールアドレスを指定し、33枠の新規回数券を付与する"
    // Let's add a new active ticket!
    const newTicketId = mockTickets.length + 1;
    mockTickets.push({
      id: newTicketId,
      user_id: user.id,
      total_slots: 33,
      remaining_slots: 33,
      status: "active",
      purchased_at: nowStr,
    });

    return { success: true, message: `${user.name}様に回数券（33枠）を新規付与しました。` };
  }

  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ? OR email = ?").get(target, target) as User | undefined;
    if (!user) {
      return { success: false, message: "該当する会員が見つかりません。" };
    }

    db.prepare(`
      INSERT INTO tickets (user_id, total_slots, remaining_slots, status, purchased_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, 33, 33, "active", nowStr);

    return { success: true, message: `${user.name}様に回数券（33枠）を新規付与しました。` };
  } catch {
    return { success: false, message: "回数券の付与中にエラーが発生しました。" };
  }
}
