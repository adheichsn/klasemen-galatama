"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Fish,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Login gagal");
      }
      window.location.assign("/admin");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login gagal");
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px] rounded-[28px] border border-blue-100 bg-white p-8 sm:p-10 shadow-[0_24px_75px_rgba(30,73,161,0.10)]">
        <Link
          href="/"
          className="mb-9 flex items-center gap-2.5 text-xl font-black tracking-tight text-slate-900"
        >
          <span className="rounded-xl bg-blue-600 p-2 text-white">
            <Fish size={23} />
          </span>{" "}
          WEJI <span className="-ml-2 text-blue-600">ARENA</span>
        </Link>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
          <ShieldCheck size={14} /> PRIVATE STAFF ACCESS
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[#142A55]">
          Masuk sebagai panitia.
        </h1>
        <p className="mt-2 mb-7 text-sm leading-6 text-slate-500">
          Halaman ini khusus untuk pengelola turnamen WEJI ARENA.
        </p>
        <form onSubmit={login} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Username
            <input
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Username panitia"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Masukkan password"
            />
          </label>
          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          <button
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            <LockKeyhole size={17} />
            {busy ? "Memeriksa akses..." : "Login Panitia"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5 text-xs text-slate-500">
          <Link href="/" className="hover:text-blue-600">
            ← Kembali ke publik
          </Link>
          <span className="flex items-center gap-1">
            <KeyRound size={13} /> Server protected
          </span>
        </div>
      </div>
    </div>
  );
}
