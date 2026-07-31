/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Ticket as TicketIcon,
  User as UserIcon,
  History,
  Plus,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Flame,
  ArrowRightLeft,
  Mail,
  UserCheck
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
}

interface Ticket {
  id: string;
  user_id: string;
  total_slots: number;
  remaining_slots: number;
  status: "active" | "exhausted";
  purchased_at: string;
}

interface UsageLog {
  id: string;
  ticket_id: string;
  used_slots: number;
  used_at: string;
  user_name?: string;
  user_email?: string;
}

export default function Home() {
  // Authentication & Role Swapper States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userList, setUserList] = useState<User[]>([]);
  const [selectedAuthEmail, setSelectedAuthEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [customRole, setCustomRole] = useState<"member" | "admin">("member");

  // Domain data states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Member views states
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [consumeSlots, setConsumeSlots] = useState<number>(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Admin views states
  const [issueEmail, setIssueEmail] = useState("");
  const [issueSlots, setIssueSlots] = useState<number>(33);
  const [adminUsersInfo, setAdminUsersInfo] = useState<{ [key: string]: { name: string; email: string; remaining: number } }>({});

  // Load all users for authentication switcher at start
  const fetchUsers = useCallback(async (shouldLoginFirst = false) => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (data.success) {
        setUserList(data.users || []);
        if (data.users && data.users.length > 0 && shouldLoginFirst) {
          // Default login with the first user
          setCurrentUser(data.users[0]);
          setSelectedAuthEmail(data.users[0].email);
        }
      }
    } catch (err) {
      console.error("Failed to load users", err);
    }
  }, []);

  useEffect(() => {
    fetchUsers(true);
  }, [fetchUsers]);

  // Fetch tickets and logs based on the current user and view
  const loadDomainData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setErrorMsg("");
    try {
      if (currentUser.role === "member") {
        // Fetch tickets of current user
        const tktRes = await fetch(`/api/tickets?userId=${currentUser.id}`);
        const tktData = await tktRes.json();
        if (tktData.success) {
          setTickets(tktData.tickets);
          const activeTicket = tktData.tickets.find((t: Ticket) => t.status === "active");
          if (activeTicket) {
            setSelectedTicketId(activeTicket.id);
          } else if (tktData.tickets.length > 0) {
            setSelectedTicketId(tktData.tickets[0].id);
          } else {
            setSelectedTicketId("");
          }
        }

        // Fetch logs of current user
        const logRes = await fetch(`/api/logs?userId=${currentUser.id}`);
        const logData = await logRes.json();
        if (logData.success) {
          setLogs(logData.logs);
        }
      } else {
        // Admin View - Load all tickets, all logs, all users
        const tktRes = await fetch(`/api/tickets`);
        const tktData = await tktRes.json();
        const logRes = await fetch(`/api/logs`);
        const logData = await logRes.json();
        const usersRes = await fetch(`/api/auth`);
        const usersData = await usersRes.json();

        if (tktData.success && logData.success && usersData.success) {
          setTickets(tktData.tickets);
          setLogs(logData.logs);

          // Map users with their active tickets
          const uMap: { [key: string]: { name: string; email: string; remaining: number } } = {};
          usersData.users.forEach((u: User) => {
            if (u.role === "member") {
              // Find active tickets sum
              const userActiveTkts = tktData.tickets.filter(
                (t: Ticket) => t.user_id === u.id && t.status === "active"
              );
              const sum = userActiveTkts.reduce((acc: number, t: Ticket) => acc + t.remaining_slots, 0);
              uMap[u.id] = {
                name: u.name,
                email: u.email,
                remaining: sum,
              };
            }
          });
          setAdminUsersInfo(uMap);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("データの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadDomainData();
  }, [currentUser, loadDomainData]);

  const handleUserSwitch = (email: string) => {
    const user = userList.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
      setSelectedAuthEmail(email);
      setSuccessMsg(`${user.name}様としてログインしました。`);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleRegisterAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customEmail) {
      setErrorMsg("名前とメールアドレスを入力してください。");
      return;
    }
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customName, email: customEmail, role: customRole }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setSelectedAuthEmail(data.user.email);
        setCustomName("");
        setCustomEmail("");
        // Reload global switcher
        await fetchUsers(false);
        setSuccessMsg("新規ユーザーを作成しログインしました。");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(data.message || "登録に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("エラーが発生しました。");
    }
  };

  // Ticket Consumption action
  const handleConsumeTickets = async () => {
    if (!selectedTicketId) {
      setErrorMsg("消費対象の回数券が選択されていません。");
      return;
    }
    setShowConfirmModal(false);
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/tickets/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedTicketId, slots: consumeSlots }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setTimeout(() => setSuccessMsg(""), 5000);
        await loadDomainData();
      } else {
        setErrorMsg(data.message || "消費処理に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  // Ticket Issuance action by Admin
  const handleIssueTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueEmail) {
      setErrorMsg("対象のメールアドレスを入力してください。");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: issueEmail, slots: issueSlots }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setIssueEmail("");
        setIssueSlots(33);
        setTimeout(() => setSuccessMsg(""), 5000);
        // Refresh users & domain data
        await fetchUsers(false);
        await loadDomainData();
      } else {
        setErrorMsg(data.message || "回数券の付与に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  // System Database Reset
  const handleResetDb = async () => {
    if (!confirm("データベースを初期状態（田中太郎、佐藤花子のチケットあり）にリセットしますか？")) {
      return;
    }
    try {
      const res = await fetch("/api/logs", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("データベースをリセットしました。");
        setTimeout(() => setSuccessMsg(""), 3000);
        await fetchUsers(false);
        await loadDomainData();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("リセットに失敗しました。");
    }
  };

  // Progress calculations for member
  const currentActiveTicket = tickets.find(t => t.id === selectedTicketId) || tickets.find(t => t.status === "active");
  const percentage = currentActiveTicket
    ? Math.round((currentActiveTicket.remaining_slots / currentActiveTicket.total_slots) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Top Header / Testing Role Switcher */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 text-white p-2 rounded-xl">
                <TicketIcon className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-lg text-slate-900 tracking-tight">
                デジタル回数券 app
              </h1>
            </div>

            {/* Quick Refresh */}
            <button
              onClick={loadDomainData}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-900 transition active:scale-95 disabled:opacity-50"
              title="データを更新"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Test Session Controller & User Switcher */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex flex-col gap-2 mt-1 text-xs">
            <div className="flex items-center justify-between text-indigo-900 font-semibold mb-1">
              <span className="flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                検証用ロール切替
              </span>
              <button
                onClick={handleResetDb}
                className="text-red-600 hover:text-red-800 font-bold transition active:scale-95 hover:underline"
              >
                DBリセット
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2">
                <label className="text-slate-600 font-medium shrink-0">現在のログイン:</label>
                <select
                  value={selectedAuthEmail}
                  onChange={(e) => handleUserSwitch(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg py-1.5 px-2 text-slate-800 font-medium shadow-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="" disabled>ユーザーを選択してください</option>
                  {userList.map(u => (
                    <option key={u.id} value={u.email}>
                      [{u.role === 'admin' ? '管理者' : '会員'}] {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area - Constrained to Smartphone Width */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-5 flex flex-col gap-5 pb-24">

        {/* Status Messages */}
        {successMsg && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-r-xl shadow-xs flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-sm font-medium">{successMsg}</div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-r-xl shadow-xs flex items-start gap-2.5 animate-fadeIn">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-sm font-medium">{errorMsg}</div>
          </div>
        )}

        {/* User Card */}
        {currentUser && (
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-10 rounded-full translate-x-12 -translate-y-12"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/50'
                }`}>
                  {currentUser.role === 'admin' ? '店舗管理者' : 'コワーキング会員'}
                </span>
                <h2 className="text-xl font-bold mt-2 flex items-center gap-1.5">
                  <UserIcon className="w-5 h-5 text-indigo-400" />
                  {currentUser.name} 様
                </h2>
                <p className="text-xs text-indigo-200/80 mt-1">{currentUser.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* 1. MEMBER WORKSPACE */}
        {currentUser && currentUser.role === "member" && (
          <>
            {/* Visual ticket indicator */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex flex-col gap-4">
              <h3 className="font-bold text-slate-900 text-md flex items-center gap-1.5">
                <TicketIcon className="w-5 h-5 text-indigo-600" />
                保有している回数券
              </h3>

              {tickets.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">現在保有している回数券はありません</p>
                  <p className="text-xs text-slate-400 mt-1">店舗の管理者の方から回数券を付与してもらってください。</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Dropdown if multiple tickets exist */}
                  {tickets.length > 1 && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-500 font-bold">使用する回数券を選択:</label>
                      <select
                        value={selectedTicketId}
                        onChange={(e) => setSelectedTicketId(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {tickets.map((t, idx) => (
                          <option key={t.id} value={t.id}>
                            回数券 #{idx + 1} ({t.remaining_slots}/{t.total_slots}枠残り - {t.status === 'active' ? '有効' : '使い切り'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {currentActiveTicket ? (
                    <div className="flex flex-col items-center py-2">
                      {/* Big circle progress visual */}
                      <div className="relative w-40 h-40 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            className="text-slate-100"
                            strokeWidth="10"
                            stroke="currentColor"
                            fill="transparent"
                          />
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            className="text-indigo-600 transition-all duration-500 ease-out"
                            strokeWidth="12"
                            strokeDasharray={439.8}
                            strokeDashoffset={439.8 - (439.8 * percentage) / 100}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                          />
                        </svg>

                        <div className="text-center z-10">
                          <span className="text-xs text-slate-400 font-bold block mb-0.5">残りの枠数</span>
                          <span className="text-4xl font-extrabold text-slate-900">
                            {currentActiveTicket.remaining_slots}
                          </span>
                          <span className="text-lg font-bold text-slate-400">
                            /{currentActiveTicket.total_slots}
                          </span>
                          <span className="text-[10px] text-indigo-600 font-extrabold block mt-1 px-2 py-0.5 bg-indigo-50 rounded-full">
                            1枠 = 100円相当
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-50 rounded-xl p-3 mt-4 text-xs text-slate-500 flex justify-between">
                        <span>購入日: {new Date(currentActiveTicket.purchased_at).toLocaleDateString('ja-JP')}</span>
                        <span className={`font-bold ${currentActiveTicket.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {currentActiveTicket.status === 'active' ? '利用可能' : '使用済'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                      選択された回数券はすでに使い切っています。
                    </div>
                  )}

                  {/* Consume Ticket Action Button */}
                  {currentActiveTicket && currentActiveTicket.status === "active" && (
                    <div className="mt-2 pt-4 border-t border-slate-100 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 text-sm">今回消費する枠数:</label>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setConsumeSlots(num)}
                              disabled={num > (currentActiveTicket?.remaining_slots || 0)}
                              className={`w-10 h-10 rounded-xl font-bold text-sm transition-all duration-150 ${
                                consumeSlots === num
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-30 disabled:pointer-events-none"
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl text-md shadow-md hover:shadow-lg transition-all duration-150 active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                      >
                        <Flame className="w-5 h-5 fill-current" />
                        <span>{consumeSlots}枠を消費する</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Individual consumption history */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex flex-col gap-3">
              <h3 className="font-bold text-slate-900 text-md flex items-center gap-1.5">
                <History className="w-5 h-5 text-slate-500" />
                利用履歴
              </h3>

              {logs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">利用履歴はまだありません。</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">
                          {log.used_slots}枠 消費
                        </div>
                        <div className="text-slate-400 mt-0.5">
                          {new Date(log.used_at).toLocaleString("ja-JP")}
                        </div>
                      </div>
                      <div className="text-slate-400 font-medium">
                        回数券 ID: ...{log.ticket_id.slice(-5)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* 2. ADMIN WORKSPACE */}
        {currentUser && currentUser.role === "admin" && (
          <>
            {/* Create / Issue Ticket Area */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex flex-col gap-4">
              <h3 className="font-bold text-slate-900 text-md flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-indigo-600" />
                新規回数券の付与 (販売登録)
              </h3>

              <form onSubmit={handleIssueTicket} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-600 font-bold">
                    会員のメールアドレス:
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="example@member.com"
                      value={issueEmail}
                      onChange={(e) => setIssueEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-9 pr-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    />
                  </div>
                  {/* Quick suggestion of existing members */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {userList.filter(u => u.role === 'member').map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setIssueEmail(u.email)}
                        className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 px-2 py-1 rounded text-[10px] font-bold transition"
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-600 font-bold">
                    付与する枠数:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIssueSlots(33)}
                      className={`py-3 px-4 rounded-xl font-bold text-xs transition border ${
                        issueSlots === 33
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      標準: 33枠 (3,300円)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIssueSlots(10)}
                      className={`py-3 px-4 rounded-xl font-bold text-xs transition border ${
                        issueSlots === 10
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      お試し: 10枠 (1,000円)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-sm transition active:scale-[0.98] disabled:opacity-50 mt-1 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>回数券を新規付与する</span>
                </button>
              </form>
            </div>

            {/* Member List & Active slot summary */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex flex-col gap-3">
              <h3 className="font-bold text-slate-900 text-md flex items-center gap-1.5">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                会員一覧・残枠状況
              </h3>

              <div className="divide-y divide-slate-100">
                {Object.keys(adminUsersInfo).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">登録された会員はいません。</p>
                ) : (
                  Object.entries(adminUsersInfo).map(([uid, info]) => (
                    <div key={uid} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-800">{info.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{info.email}</div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          info.remaining > 0
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/50'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          残り {info.remaining} 枠
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Overall Store/Admin Consumption Log */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex flex-col gap-3">
              <h3 className="font-bold text-slate-900 text-md flex items-center gap-1.5">
                <History className="w-5 h-5 text-slate-500" />
                店舗全体の消費履歴ログ
              </h3>

              {logs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">店舗全体での消費履歴はまだありません。</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div key={log.id} className="py-2.5 flex flex-col gap-0.5 text-xs">
                      <div className="flex justify-between items-center font-bold text-slate-800">
                        <span>{log.user_name || "不明なユーザー"}</span>
                        <span className="text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-md font-extrabold">
                          {log.used_slots}枠 消費
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[10px] mt-0.5">
                        <span>{log.user_email}</span>
                        <span>{new Date(log.used_at).toLocaleString("ja-JP")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* 3. NEW USER CREATION PORTAL FOR DEMONSTRATION */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex flex-col gap-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <UserIcon className="w-4 h-4 text-slate-500" />
            検証用新規登録 (デモ機能)
          </h3>
          <p className="text-xs text-slate-400">
            お好きな名前とアドレスで会員または管理者を即座に登録できます。
          </p>

          <form onSubmit={handleRegisterAndLogin} className="flex flex-col gap-3 mt-1">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="お名前"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
              />
              <input
                type="email"
                placeholder="メールアドレス"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2.5">
                <label className="flex items-center gap-1 text-xs text-slate-600 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="customRole"
                    checked={customRole === "member"}
                    onChange={() => setCustomRole("member")}
                    className="accent-indigo-600"
                  />
                  会員
                </label>
                <label className="flex items-center gap-1 text-xs text-slate-600 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="customRole"
                    checked={customRole === "admin"}
                    onChange={() => setCustomRole("admin")}
                    className="accent-indigo-600"
                  />
                  管理者
                </label>
              </div>

              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs transition active:scale-95 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>登録 & ログイン</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && currentActiveTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-slate-100 flex flex-col gap-4 animate-scaleUp">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h4 className="text-lg font-extrabold text-slate-900">
                消費の確認
              </h4>
              <p className="text-sm text-slate-500 mt-2">
                コワーキングスペースをチェックインします。<br />
                本当に <span className="font-extrabold text-indigo-600 text-md">{consumeSlots} 枠</span> 消費しますか？
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 text-xs text-slate-500 flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span>現在保有数:</span>
                <span className="font-bold text-slate-800">{currentActiveTicket.remaining_slots} 枠</span>
              </div>
              <div className="flex justify-between">
                <span>消費後の保有数:</span>
                <span className="font-bold text-indigo-600">{currentActiveTicket.remaining_slots - consumeSlots} 枠</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-2xl text-xs transition"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConsumeTickets}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl text-xs shadow-sm shadow-indigo-200 transition"
              >
                本当に消費する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Mobile indicator */}
      <footer className="bg-white border-t border-slate-100 py-4 text-center text-[10px] text-slate-400 shrink-0">
        <p>© 2026 コワーキングスペース デジタル回数券システム MVP</p>
        <p className="mt-1 font-mono">PWA-ready design | Optimization: Mobile viewport</p>
      </footer>
    </div>
  );
}
