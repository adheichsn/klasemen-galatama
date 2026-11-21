import { Eye } from "lucide-react";
import { FormattedEventText } from "@/components/formatted-event-text";

export function FormatPreview({ text }: { text: string }) {
  return (
    <details className="mt-1 min-w-0 rounded-xl border border-blue-100 bg-white text-left">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
        <Eye aria-hidden="true" size={15} /> Preview format
      </summary>
      <div className="border-t border-blue-100 px-3 py-3">
        {text.trim() ? <FormattedEventText text={text} /> : <p className="text-xs text-slate-500">Isi teks untuk melihat preview.</p>}
      </div>
    </details>
  );
}

export function FormatHelp() {
  return <p className="text-xs font-normal leading-6 text-slate-500">
    Gunakan Enter untuk setiap baris. Awali dengan <code>1. </code> untuk nomor,
    <code> - </code> untuk bullet, <code>**tebal**</code> untuk cetak tebal,
    <code> *miring*</code> untuk cetak miring, atau <code> # Subjudul</code> untuk subjudul.
    HTML tidak dirender.
  </p>;
}
