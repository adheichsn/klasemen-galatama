"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function PublicAutoRefresh({
  intervalMs = 15000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700">
      <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />{" "}
      Klasemen refresh otomatis setiap 15 detik
    </span>
  );
}
