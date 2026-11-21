import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { CircleHelp, ShieldCheck, ArrowRight } from "lucide-react";
import {
  Breadcrumb,
  FaqAccordion,
  PublicShell,
} from "@/components/public-site";
import { generalFaq } from "@/lib/general-faq";

export const metadata = pageMetadata({
  title: "FAQ dan Bantuan",
  description:
    "Informasi umum WEJI ARENA, cara menemukan turnamen, profil pemain Roblox, klasemen dan hasil akhir.",
  path: "/faq",
});
export default function FAQPage() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        <Breadcrumb label="FAQ" />
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-xs font-black tracking-widest text-blue-600">
            <CircleHelp size={18} /> HELP CENTER
          </div>
          <h1 className="text-3xl font-black text-[#142A55]">
            Frequently Asked Questions
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Informasi umum seputar WEJI ARENA.
          </p>
        </div>
        <FaqAccordion questions={generalFaq} />
        <section className="mt-7 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <h2 className="flex items-center gap-2 font-black text-[#142A55]">
            <ShieldCheck size={19} className="shrink-0 text-blue-600" />{" "}
            Peraturan turnamen
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Setiap pertandingan memiliki ketentuan tersendiri. Baca informasi
            resmi di halaman turnamen pilihanmu.
          </p>
          <Link
            href="/turnamen"
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-600"
          >
            Jelajahi Turnamen <ArrowRight size={15} />
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
