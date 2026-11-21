"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ListFilter,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { MarketplaceEvent } from "@/lib/marketplace-filters";
import {
  filterMarketplaceEvents,
  type MarketplaceMode,
  type MarketplaceSort,
  type MarketplaceStatus,
} from "@/lib/marketplace-filters";
import { EmptyEvents, EventCard } from "@/components/public-site";

const modes: { value: MarketplaceMode; label: string }[] = [
  { value: "all", label: "Semua Mode" },
  { value: "solo", label: "SOLO" },
  { value: "duo", label: "DUO" },
  { value: "squad", label: "SQUAD" },
];
const stages: { value: MarketplaceStatus; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "live", label: "Live" },
  { value: "draft", label: "Upcoming" },
  { value: "finished", label: "Finished" },
];
const pageSize = 9;

export function MarketplaceCatalog({
  events,
  initialQuery = "",
  initialMode = "all",
  initialStatus = "all",
  initialSort = "recommended",
}: {
  events: MarketplaceEvent[];
  initialQuery?: string;
  initialMode?: MarketplaceMode;
  initialStatus?: MarketplaceStatus;
  initialSort?: MarketplaceSort;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<MarketplaceMode>(initialMode);
  const [status, setStatus] = useState<MarketplaceStatus>(initialStatus);
  const [sort, setSort] = useState<MarketplaceSort>(initialSort);
  const [limit, setLimit] = useState(pageSize);
  // Sync with navigation links to /turnamen?status=live, without remounting and
  // stealing focus from the search input while the user is typing.
  useEffect(() => {
    setQuery(initialQuery);
    setMode(initialMode);
    setStatus(initialStatus);
    setSort(initialSort);
    setLimit(pageSize);
  }, [initialQuery, initialMode, initialStatus, initialSort]);
  // Filters are instant locally, and the URL stays shareable/bookmarkable.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (mode !== "all") params.set("mode", mode);
      if (status !== "all") params.set("status", status);
      if (sort !== "recommended") params.set("sort", sort);
      const suffix = params.toString();
      const nextUrl = `/turnamen${suffix ? `?${suffix}` : ""}`;
      if (
        window.location.pathname === "/turnamen" &&
        `${window.location.pathname}${window.location.search}` !== nextUrl
      ) {
        window.history.replaceState(window.history.state, "", nextUrl);
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [query, mode, status, sort]);
  const result = useMemo(
    () => filterMarketplaceEvents(events, { query, mode, status, sort }),
    [events, query, mode, status, sort],
  );
  const selectMode = (value: MarketplaceMode) => {
    setMode(value);
    setLimit(pageSize);
  };
  const selectStatus = (value: MarketplaceStatus) => {
    setStatus(value);
    setLimit(pageSize);
  };
  const reset = () => {
    setQuery("");
    setMode("all");
    setStatus("all");
    setSort("recommended");
    setLimit(pageSize);
  };
  const active =
    !!query.trim() ||
    mode !== "all" ||
    status !== "all" ||
    sort !== "recommended";
  return (
    <div>
      <div className="rounded-[26px] border border-blue-100 bg-white p-4 shadow-[0_12px_35px_rgba(23,67,140,.05)] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black text-[#142A55]">
            <SlidersHorizontal size={18} className="text-blue-600" /> Temukan
            Event
          </div>
          {active && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50"
            >
              <RotateCcw size={13} /> Reset filter
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
          <label className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-[#f8faff] px-4 py-3 text-slate-500 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <Search size={18} className="text-blue-600" aria-hidden="true" />
            <span className="sr-only">
              Cari nama, lokasi, atau penyelenggara turnamen
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(pageSize);
              }}
              maxLength={100}
              placeholder="Cari nama turnamen, map atau pulau..."
              className="w-full min-w-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </label>
          <label className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600">
            <ListFilter
              size={17}
              className="shrink-0 text-blue-600"
              aria-hidden="true"
            />
            <span className="sr-only">Urutkan turnamen</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as MarketplaceSort);
                setLimit(pageSize);
              }}
              className="min-h-12 w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
            >
              <option value="recommended">Rekomendasi</option>
              <option value="newest">Tanggal terbaru</option>
              <option value="participants">Peserta terbanyak</option>
              <option value="alphabetical">Nama A–Z</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-col justify-between gap-4 border-t border-slate-100 pt-4 lg:flex-row lg:items-center">
          <div
            className="flex flex-wrap items-center gap-2"
            aria-label="Filter mode turnamen"
          >
            {modes.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={mode === item.value}
                onClick={() => selectMode(item.value)}
                className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${mode === item.value ? "bg-blue-600 !text-white shadow-md shadow-blue-100" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            className="flex flex-wrap items-center gap-2"
            aria-label="Filter status turnamen"
          >
            {stages.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={status === item.value}
                onClick={() => selectStatus(item.value)}
                className={`rounded-full border px-3 py-2 text-xs font-bold transition ${status === item.value ? "border-[#142A55] bg-[#142A55] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mb-5 mt-7 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm font-bold text-slate-600">
          <span className="text-blue-700">{result.length}</span> turnamen
          ditemukan
        </p>
        <Link
          href="/arsip"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
        >
          Lihat arsip turnamen <ArrowRight size={14} />
        </Link>
      </div>
      {result.length ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {result.slice(0, limit).map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
          {result.length > limit && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setLimit((n) => n + pageSize)}
                className="rounded-xl border border-blue-200 bg-white px-6 py-3 text-sm font-extrabold text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                Muat lebih banyak ({result.length - limit} tersisa)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <EmptyEvents type="turnamen yang sesuai pencarian" />
          {active && (
            <div className="text-center">
              <button
                type="button"
                className="text-sm font-bold text-blue-700 hover:underline"
                onClick={reset}
              >
                Hapus semua filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
