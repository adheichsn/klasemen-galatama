import Link from "next/link";
import { FeaturedCarousel } from "@/components/featured-carousel";
import { PublicReveal } from "@/components/public-reveal";
import { Search } from "lucide-react";
import {
  ArrowRight,
  Archive,
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Fish,
  Globe2,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Waves,
} from "lucide-react";
import { publicEvents } from "@/lib/public-events";
import {
  EventCard,
  EmptyEvents,
  FaqAccordion,
  PublicFooter,
  PublicHeader,
  SectionTitle,
} from "@/components/public-site";
import { standings } from "@/lib/arena-utils";
export const dynamic = "force-dynamic";
const categories = [
  {
    href: "/turnamen?status=live",
    name: "Live Event",
    desc: "Pantau klasemen",
    icon: Radio,
    gradient: "from-[#DBEAFE] to-[#EFF6FF]",
    color: "text-blue-700",
  },
  {
    href: "/turnamen?mode=solo",
    name: "Solo",
    desc: "Individual battle",
    icon: Fish,
    gradient: "from-[#E8EDFF] to-[#F4F6FF]",
    color: "text-indigo-600",
  },
  {
    href: "/turnamen?mode=squad",
    name: "Squad",
    desc: "Team competition",
    icon: Users,
    gradient: "from-[#D6F5FE] to-[#EFFAFF]",
    color: "text-cyan-700",
  },
  {
    href: "/turnamen?status=draft",
    name: "Upcoming",
    desc: "Jadwal berikutnya",
    icon: CalendarDays,
    gradient: "from-[#FFF0E3] to-[#FFF8F2]",
    color: "text-orange-700",
  },
  {
    href: "/arsip",
    name: "Archives",
    desc: "Riwayat event",
    icon: Archive,
    gradient: "from-[#E8F0FF] to-[#F3F8FF]",
    color: "text-sky-700",
  },
  {
    href: "/hall-of-fame",
    name: "Hall of Fame",
    desc: "Para champions",
    icon: Trophy,
    gradient: "from-[#FFF5CF] to-[#FFFCEF]",
    color: "text-amber-700",
  },
];
export default async function HomePage() {
  const { events, unavailable } = await publicEvents();
  const live = events.filter((e) => e.status === "live");
  const upcoming = events.filter((e) => e.status === "draft");
  const recent = events
    .filter((e) => e.status === "finished")
    .sort((a, b) =>
      (b.finishedAt || b.eventDate || "").localeCompare(
        a.finishedAt || a.eventDate || "",
      ),
    );
  const showcase = [...live, ...upcoming, ...recent]
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
    .slice(0, 6);
  const totalPlayers = events.reduce((n, e) => n + e.participants.length, 0);
  const faqs = events
    .flatMap((e) => e.faqs)
    .filter((x, i, a) => a.findIndex((y) => y.question === x.question) === i)
    .slice(0, 4);
  return (
    <div className="weji-public min-h-screen bg-[#f5f8ff] text-[#172b4d]">
      <PublicHeader />
      <main>
        <FeaturedCarousel
          events={[...events]
            .sort(
              (a, b) =>
                Number(!!b.featured) - Number(!!a.featured) ||
                Number(b.status === "live") - Number(a.status === "live"),
            )
            .filter((e) => e.featured || e.status === "live")
            .slice(0, 4)
            .map((e) => ({
              id: e.id,
              title: e.title,
              subtitle: e.subtitle,
              location: e.location,
              mode: e.mode,
              status: e.status,
              bannerUrl: e.bannerUrl,
            }))}
          eventCount={events.length}
          liveCount={live.length}
          playerCount={totalPlayers}
        />
        <div className="mx-auto max-w-[1260px] space-y-14 px-4 py-10 sm:space-y-20 sm:px-6 sm:py-14">
          {unavailable && (
            <div
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              Data turnamen belum bisa dimuat. Coba lagi nanti.
            </div>
          )}
          <form
            action="/turnamen"
            className="-mt-3 flex flex-col items-stretch gap-3 rounded-[24px] border border-blue-100 bg-white p-3 shadow-[0_15px_40px_rgba(18,52,125,.07)] sm:flex-row sm:items-center sm:p-4"
          >
            <label className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
              <Search size={20} className="text-blue-600" />
              <span className="sr-only">Cari event atau pulau</span>
              <input
                name="q"
                maxLength={100}
                className="min-w-0 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Cari turnamen, map, atau pulau..."
              />
            </label>
            <select
              name="mode"
              aria-label="Filter mode"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600"
            >
              <option value="all">Semua Mode</option>
              <option value="solo">SOLO</option>
              <option value="squad">SQUAD</option>
            </select>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold !text-white transition hover:bg-blue-700"
            >
              Cari Event <ArrowRight size={16} className="ml-1 inline" />
            </button>
          </form>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { href: "/turnamen?status=live", title: "Sedang Berlangsung", count: live.length, detail: "Ikuti persaingan realtime", icon: Radio, tint: "from-blue-600 to-[#2d84ed]" },
              { href: "/turnamen?status=draft", title: "Segera Dimulai", count: upcoming.length, detail: "Cari event berikutnya", icon: CalendarDays, tint: "from-[#354b99] to-[#6980d2]" },
              { href: "/arsip", title: "Selesai & Diarsipkan", count: recent.length, detail: "Jelajahi sejarah juara", icon: Trophy, tint: "from-[#15557c] to-[#238eb2]" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className={`group flex items-center gap-4 rounded-[20px] bg-gradient-to-br ${item.tint} px-5 py-5 text-white shadow-[0_12px_30px_rgba(25,67,143,.10)] transition hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none`}>
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><item.icon size={23} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-blue-100">{item.title}</span><span className="mt-0.5 block text-[21px] font-black tabular-nums">{item.count} <span className="text-[11px] font-bold text-white/80">Event</span></span><span className="block truncate text-[10px] text-white/70">{item.detail}</span></span>
                <ArrowRight size={17} className="text-white/70 transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
          <PublicReveal>
            <section>
              <SectionTitle
                eyebrow="CHOOSE YOUR ADVENTURE"
                title="Mau Jelajahi Apa Nih?"
                desc="Akses semua bagian arena dengan satu klik."
              />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {categories.map((c) => (
                  <Link
                    href={c.href}
                    key={c.name}
                    className="group rounded-[20px] border border-blue-100 bg-white p-3.5 shadow-[0_8px_30px_rgba(30,61,132,.035)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg motion-reduce:transform-none"
                  >
                    <span
                      className={`flex h-[72px] items-center justify-center rounded-2xl bg-gradient-to-br ${c.gradient}`}
                    >
                      <c.icon size={34} strokeWidth={1.7} className={c.color} />
                    </span>
                    <span className="mt-3 block text-[13px] font-black text-[#142A55]">
                      {c.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {c.desc}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </PublicReveal>
          <PublicReveal>
            <section>
              <SectionTitle
                eyebrow="DISCOVER COMPETITIONS"
                title="Explore Tournaments"
                desc="Cari turnamen yang pas buat kamu, dari SOLO hingga SQUAD."
                href="/turnamen"
              />
              {showcase.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {showcase.map((e, i) => (
                    <EventCard key={e.id} event={e} index={i} />
                  ))}
                </div>
              ) : (
                <EmptyEvents />
              )}
            </section>
          </PublicReveal>
          {live.length > 0 && (
            <section>
              <SectionTitle
                eyebrow="THE COMPETITION IS ON"
                title="Live in the Arena"
                desc="Klasemen turnamen yang sedang berlangsung."
                href="/turnamen?status=live"
              />
              <div className="grid gap-4 lg:grid-cols-2">
                {live.slice(0, 2).map((e) => (
                  <Link
                    key={e.id}
                    href={`/turnamen/${encodeURIComponent(e.id)}`}
                    className="group rounded-[22px] border border-blue-100 bg-white p-5 transition hover:shadow-xl"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs font-black text-red-500">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />{" "}
                        LIVE {e.mode.toUpperCase()}
                      </span>
                      <ChevronRight size={17} className="text-blue-600" />
                    </div>
                    <h3 className="mb-4 line-clamp-1 text-base font-black text-[#142A55]">
                      {e.title}
                    </h3>
                    {standings(e)
                      .slice(0, 3)
                      .map((r, i) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between border-t border-slate-100 py-3 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-black text-blue-600">
                              #{i + 1}
                            </span>
                            <span className="font-bold text-slate-700">
                              {r.name}
                            </span>
                          </div>
                          <b className="text-blue-700">{r.points} PTS</b>
                        </div>
                      ))}
                    {!e.participants.length && (
                      <div className="py-5 text-sm text-slate-500">
                        Belum ada peserta.
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
          <PublicReveal>
            <section>
              <SectionTitle
                eyebrow="MEMORIES & LEGENDS"
                title="Galatama Archives"
                desc="Setiap turnamen punya cerita dan pemenangnya."
                href="/arsip"
                link="Lihat Arsip"
              />
              {recent.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {recent.slice(0, 3).map((e, i) => (
                    <EventCard key={e.id} event={e} index={i + 1} />
                  ))}
                </div>
              ) : (
                <EmptyEvents type="arsip Galatama" />
              )}
            </section>
          </PublicReveal>
          <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
            <div className="relative overflow-hidden rounded-[25px] bg-gradient-to-br from-[#132C66] to-[#2563eb] p-7 text-white sm:p-9">
              <div className="pointer-events-none absolute -bottom-16 -right-12 rounded-full border-[45px] border-white/10 p-10">
                <Trophy size={92} />
              </div>
              <span className="text-[10px] font-extrabold tracking-[.2em] text-blue-200">
                LEGENDS LIVE FOREVER
              </span>
              <Trophy size={34} className="my-5 text-amber-300" />
              <h2 className="max-w-[340px] text-3xl font-black tracking-[-.04em]">
                Every Champion Has a Story.
              </h2>
              <p className="mt-3 max-w-[330px] text-sm leading-7 text-blue-100">
                Kenali para juara dari setiap edisi, baik SOLO maupun SQUAD.
              </p>
              <Link
                href="/hall-of-fame"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-blue-700"
              >
                Hall of Fame <ArrowRight size={15} />
              </Link>
            </div>
            <div>
              <SectionTitle
                eyebrow="NEED HELP?"
                title="Frequently Asked Questions"
                desc="Cari tahu cara kerja kompetisi di arena."
                href="/faq"
              />
              {faqs.length ? (
                <FaqAccordion questions={faqs} />
              ) : (
                <div className="rounded-2xl border border-blue-100 bg-white p-6 text-sm leading-7 text-slate-600">
                  <b className="block text-base text-[#142A55]">
                    Bagaimana sistem poin WEJI ARENA?
                  </b>
                  <p className="mt-2">
                    Setiap turnamen punya katalog ikan dan bonus poin sendiri
                    yang ditentukan panitia. Periksa halaman detail event untuk
                    aturan resminya.
                  </p>
                  <Link
                    href="/faq"
                    className="mt-3 inline-flex items-center gap-2 font-bold text-blue-600"
                  >
                    Baca FAQ <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
