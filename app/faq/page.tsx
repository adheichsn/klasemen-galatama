import { BookOpen, CircleHelp, ShieldCheck } from "lucide-react";
import {
  Breadcrumb,
  FaqAccordion,
  PublicShell,
} from "@/components/public-site";
import { publicEvents } from "@/lib/public-events";
export const dynamic = "force-dynamic";
export default async function FAQPage() {
  const { events } = await publicEvents();
  const questions = events
    .flatMap((e) => e.faqs)
    .filter((x, i, a) => a.findIndex((q) => q.question === x.question) === i);
  return (
    <PublicShell>
      <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        <Breadcrumb label="Rules & FAQ" />
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-xs font-black tracking-widest text-blue-600">
            <CircleHelp size={18} /> HELP CENTER
          </div>
          <h1 className="text-3xl font-black text-[#142A55]">Rules & FAQ</h1>
          <p className="mt-2 text-sm text-slate-500">
            Peraturan khusus setiap event tersedia pada halaman detail
            turnamennya.
          </p>
        </div>
        <div className="mb-7 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <h2 className="flex items-center gap-2 font-black text-[#142A55]">
            <ShieldCheck size={19} className="text-blue-600" /> Aturan bersifat
            custom
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Panitia dapat mengatur jenis ikan, bonus Mutasi, Big, Shiny,
            peraturan, serta mode SOLO/SQUAD secara independen untuk setiap
            turnamen.
          </p>
        </div>
        {questions.length ? (
          <FaqAccordion questions={questions} />
        ) : (
          <div className="rounded-2xl border border-blue-100 bg-white p-6 text-sm text-slate-600">
            <BookOpen className="mb-2 text-blue-600" />
            <b className="block text-base text-[#142A55]">
              FAQ belum tersedia.
            </b>
            <p className="mt-2">
              Panitia bisa menambahkan pertanyaan dan jawaban melalui Tournament
              Builder, lalu mempublikasikan event.
            </p>
          </div>
        )}
      </main>
    </PublicShell>
  );
}
