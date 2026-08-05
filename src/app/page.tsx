"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User as UserIcon,
  Settings,
  PlusCircle,
  History,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Ticket as TicketIcon,
  RefreshCw,
  ChevronRight
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
}

interface Ticket {
  id: number;
  user_id: string;
  total_slots: number;
  remaining_slots: number;
  status: "active" | "exhausted";
  purchased_at: string;
}

interface UsageLog {
  id: number;
  ticket_id: number;
  used_slots: number;
  used_at: string;
  user_name?: string;
  user_email?: string;
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [globalLogs, setGlobalLogs] = useState<UsageLog[]>([]);

  // Form states
  const [selectedSlots, setSelectedSlots] = useState<number>(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [adminTarget, setAdminTarget] = useState("");

  // Loading & Toast states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const fetchMemberData = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/ticket/consume?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
        setLogs(data.logs);
      }
    } catch {
      showToast("error", "回数券データの更新に失敗しました。");
    }
  }, [showToast]);

  const fetchAdminData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/logs");
      const data = await res.json();
      if (data.success) {
        setGlobalLogs(data.logs);
      }
    } catch {
      showToast("error", "管理ログの更新に失敗しました。");
    }
  }, [showToast]);

  // Load initial users
  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (data.success) {
          setUsers(data.users);
          // Default to the first member (Yamada Taro) for testing
          const defaultUser = data.users.find((u: User) => u.id === "yamada-1") || data.users[0];
          setCurrentUser(defaultUser);
        } else {
          showToast("error", "ユーザー情報の取得に失敗しました。");
        }
      } catch {
        showToast("error", "ネットワークエラーが発生しました。");
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, [showToast]);

  // Fetch ticket and logs whenever the current user changes
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === "member") {
      fetchMemberData(currentUser.id);
    } else if (currentUser.role === "admin") {
      fetchAdminData();
    }
  }, [currentUser, fetchMemberData, fetchAdminData]);

  // Handle ticket consumption
  const handleConsume = async () => {
    if (!currentUser) return;
    setIsConfirmOpen(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/ticket/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, slots: selectedSlots }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `${selectedSlots}枠を消費しました。`);
        await fetchMemberData(currentUser.id);
      } else {
        showToast("error", data.error || "消費処理に失敗しました。");
      }
    } catch {
      showToast("error", "通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle ticket issuance
  const handleIssueTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTarget.trim()) {
      showToast("error", "IDまたはメールアドレスを入力してください。");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: adminTarget }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", data.message);
        setAdminTarget("");
        await fetchAdminData();
      } else {
        showToast("error", data.error || "付与処理に失敗しました。");
      }
    } catch {
      showToast("error", "通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  };

  // Switch Simulated User
  const handleUserSwitch = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
      setSelectedSlots(1);
    }
  };

  // Active ticket calculation
  const activeTicket = tickets.find(t => t.status === "active" && t.remaining_slots > 0);
  const hasTicket = !!activeTicket;
  const remaining = activeTicket ? activeTicket.remaining_slots : 0;
  const totalSlots = activeTicket ? activeTicket.total_slots : 33;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center">

      {/* Simulation Banner - Fixed at Top */}
      <div className="w-full bg-slate-900 text-slate-100 py-3 px-4 shadow-md sticky top-0 z-50 flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-slate-300">テスト用ユーザー切替:</span>
        </div>
        <select
          value={currentUser?.id || ""}
          onChange={(e) => handleUserSwitch(e.target.value)}
          className="bg-slate-800 text-slate-100 py-1 px-3 rounded border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.role === "admin" ? `[店舗] ${u.name}` : `[会員] ${u.name}`}
            </option>
          ))}
        </select>
      </div>

      {/* Main Container */}
      <main className="w-full max-w-md bg-white min-h-[calc(100vh-48px)] flex flex-col shadow-xl pb-12 relative">

        {/* Header App Brand */}
        <header className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="GARAGE Logo"
              className="h-11 w-auto object-contain mr-1"
            />
            <div>
              <h1 className="font-bold text-base text-slate-900 tracking-tight leading-tight">デジタルサブスク回数券</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider">GARAGE MACHIDA MVP</p>
            </div>
          </div>
          {currentUser && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 rounded-full py-1.5 px-3">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">{currentUser.name}</span>
            </div>
          )}
        </header>

        {/* Dynamic Toast Message */}
        {toast && (
          <div className={`mx-6 mt-4 p-4 rounded-xl flex items-center gap-3 shadow-sm border animate-fade-in ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : "bg-rose-50 border-rose-100 text-rose-800"
          }`}>
            <CheckCircle className={`w-5 h-5 flex-shrink-0 ${toast.type === "success" ? "text-emerald-500" : "text-rose-500"}`} />
            <p className="text-sm font-semibold">{toast.message}</p>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-sm text-slate-400 mt-4">データを読み込み中...</p>
          </div>
        ) : (
          <div className="px-6 py-5 flex-1 flex flex-col gap-6">

            {/* ----------------- MEMBER VIEW ----------------- */}
            {currentUser?.role === "member" && (
              <>
                {/* 1. Ticket Holding Status Card */}
                <div className={`relative overflow-hidden rounded-2xl text-white p-6 transition-all shadow-lg ${
                  hasTicket
                    ? "bg-gradient-to-br from-teal-500 to-emerald-600 shadow-emerald-100"
                    : "bg-slate-700 shadow-slate-100"
                }`}>
                  {/* Absolute subtle background ticket patterns */}
                  <div className="absolute right-[-20px] bottom-[-20px] opacity-10 text-white select-none pointer-events-none">
                    <TicketIcon className="w-48 h-48" />
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      デジタルサブスク回数券
                    </span>
                    <TicketIcon className="w-5 h-5 text-white/80" />
                  </div>

                  <h3 className="text-xl font-bold mb-6">コワーキングスペース1日利用券</h3>

                  {hasTicket ? (
                    <div>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-4xl font-extrabold tracking-tight">{remaining}</span>
                        <span className="text-sm text-white/80 font-medium">/ {totalSlots} 枠</span>
                      </div>
                      <p className="text-xs text-white/70 font-medium mb-4">
                        有効期限: なし (継続利用可能)
                      </p>

                      {/* Clean Progress Bar */}
                      <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden mb-5">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${(remaining / totalSlots) * 100}%` }}
                        ></div>
                      </div>

                      {/* 33 Visual Slots Grid */}
                      <div className="grid grid-cols-11 gap-1.5 bg-black/10 p-3 rounded-xl border border-white/5">
                        {Array.from({ length: totalSlots }).map((_, idx) => {
                          const isActive = idx < remaining;
                          return (
                            <div
                              key={idx}
                              className={`aspect-square rounded-[3px] transition-all duration-300 ${
                                isActive
                                  ? "bg-white shadow-[0_0_4px_rgba(255,255,255,0.6)]"
                                  : "bg-white/10 border border-white/10"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-white/80 text-sm font-medium mb-2">現在、有効な回数券をお持ちではありません。</p>
                      <p className="text-white/60 text-xs">店舗スタッフよりご購入いただくと、ここに残枠が表示されます。</p>
                    </div>
                  )}
                </div>

                {/* 2. Ticket Consumption Module */}
                {hasTicket && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                      <h4 className="font-bold text-sm text-slate-800">回数券を利用する</h4>
                    </div>

                    {/* Selector 1-5 */}
                    <div className="grid grid-cols-5 gap-2.5 mb-5">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const isSelected = selectedSlots === num;
                        const isDisabled = remaining < num;
                        return (
                          <button
                            key={num}
                            type="button"
                            disabled={isDisabled}
                            data-testid={`slot-btn-${num}`}
                            onClick={() => setSelectedSlots(num)}
                            className={`py-3.5 rounded-xl font-bold text-sm transition-all flex flex-col items-center justify-center ${
                              isSelected
                                ? "bg-slate-900 text-white shadow-md scale-[1.03]"
                                : isDisabled
                                  ? "bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100"
                                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100"
                            }`}
                          >
                            <span className="text-base">{num}</span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-slate-400 text-center mb-5 font-medium">
                      1枠あたり100円相当、最大5枠まで一度に消費できます。
                    </p>

                    {/* Submit Consumer Button */}
                    <button
                      type="button"
                      data-testid="consume-btn"
                      onClick={() => setIsConfirmOpen(true)}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <span>{selectedSlots}枠を消費する</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* 3. Member Usage Logs List */}
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-4 h-4 text-slate-400" />
                    <h4 className="font-bold text-sm text-slate-700">利用履歴</h4>
                  </div>

                  {logs.length > 0 ? (
                    <div className="space-y-2.5">
                      {logs.map((log) => (
                        <div key={log.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{log.used_slots}枠 消費</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{log.used_at}</p>
                          </div>
                          <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                            済
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <p className="text-xs text-slate-400 font-medium">利用履歴はまだありません。</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ----------------- ADMIN/STORE VIEW ----------------- */}
            {currentUser?.role === "admin" && (
              <>
                {/* Visual Admin Control Header Banner */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden shadow-lg">
                  <div className="absolute right-[-10px] bottom-[-20px] opacity-10 text-white pointer-events-none">
                    <Settings className="w-32 h-32" />
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
                    <Settings className="w-4 h-4" />
                    <span>管理者コントロール</span>
                  </div>
                  <h3 className="text-lg font-bold mb-1">店舗受付・管理ツール</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    会員への新規回数券（33枠）の発行、及び全店での消費履歴をリアルタイムで確認・監査できます。
                  </p>
                </div>

                {/* 1. Issue Ticket Form */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <PlusCircle className="w-4 h-4 text-emerald-500" />
                    <h4 className="font-bold text-sm text-slate-800">回数券の新規付与</h4>
                  </div>

                  <form onSubmit={handleIssueTicket} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                        対象会員の ID または メールアドレス
                      </label>
                      <input
                        type="text"
                        value={adminTarget}
                        onChange={(e) => setAdminTarget(e.target.value)}
                        placeholder="yamada@example.com"
                        data-testid="admin-target-input"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-700 font-medium placeholder-slate-300"
                      />
                    </div>

                    <div className="bg-emerald-50/50 border border-emerald-100/60 p-3.5 rounded-xl flex items-start gap-2.5">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-505 leading-normal font-medium">
                        付与すると、対象の会員に対して<strong className="text-slate-700 font-bold">1冊（33枠 / 3,300円相当）</strong>のデジタルサブスク回数券が新規追加され、即座に利用可能となります。
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      data-testid="issue-btn"
                      className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>33枠の新規デジタルサブスク回数券を付与する</span>
                      )}
                    </button>
                  </form>
                </div>

                {/* 2. Global Usage logs auditing */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-slate-400" />
                      <h4 className="font-bold text-sm text-slate-700">店舗全体の消費ログ一覧</h4>
                    </div>
                    <button
                      type="button"
                      onClick={fetchAdminData}
                      className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded flex items-center gap-1 active:bg-emerald-100"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>更新</span>
                    </button>
                  </div>

                  {globalLogs.length > 0 ? (
                    <div className="space-y-2.5">
                      {globalLogs.map((log) => (
                        <div key={log.id} className="bg-white border border-slate-150 rounded-xl p-4 flex items-center justify-between shadow-sm">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{log.user_name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{log.user_email}</p>
                            <p className="text-[11px] text-slate-400 mt-1">{log.used_at}</p>
                          </div>
                          <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100/40">
                            -{log.used_slots} 枠
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <p className="text-xs text-slate-400 font-medium">消費実績はまだありません。</p>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        )}

        {/* Brand footer */}
        <footer className="mt-auto pt-6 text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          © 2026 GARAGE CO-WORKING SPACE MACHIDA
        </footer>
      </main>

      {/* ----------------- CONFIRMATION MODAL ----------------- */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xs w-full p-6 text-center shadow-xl border border-slate-100 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-2">本当に消費しますか？</h3>

            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              誤操作防止の確認です。コワーキングスペース1日利用分として、
              <strong className="text-slate-800 font-bold">{selectedSlots}枠</strong>
              を今すぐ消費します。
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-xs transition-all border border-slate-200/60"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConsume}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
              >
                確定する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
