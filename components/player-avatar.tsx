"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { playerHref } from "@/lib/player-directory";
import { UserRound, Users } from "lucide-react";
import { avatarProfile, type AvatarProfiles, type AvatarTarget, type AvatarProfile } from "@/lib/avatar-identity";
import { safeAvatarUrl, validRobloxId } from "@/lib/player-identity";
const IdentityContext = createContext<AvatarProfiles>({});
export function useAvatarProfiles() { return useContext(IdentityContext); }
const PublicIdentityContext = createContext(false);
export function AvatarScope({ profiles, children, publicLinks = false }: { profiles: AvatarProfiles; children: ReactNode; publicLinks?: boolean }) {
  return <IdentityContext.Provider value={profiles}><PublicIdentityContext.Provider value={publicLinks}>{children}</PublicIdentityContext.Provider></IdentityContext.Provider>;
}
/** Refresh on navigation (including leaving identity editor), not score/timer ticks. */
export function AdminAvatarScope({ section, children }: { section: string; children: ReactNode }) {
  const [profiles, setProfiles] = useState<AvatarProfiles>({});
  useEffect(() => {
    const controller = new AbortController();
    setProfiles({});
    if (section === "players") return () => controller.abort();
    void fetch("/api/admin/player-identity?view=avatars", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async response => response.ok ? await response.json() as { profiles: AvatarProfiles } : null)
      .then(data => { if (!controller.signal.aborted && data?.profiles) setProfiles(data.profiles); })
      .catch(() => { /* optional decoration; admin scoring remains available */ });
    return () => controller.abort();
  }, [section]);
  return <AvatarScope profiles={profiles}>{children}</AvatarScope>;
}
const sizes = { sm: "size-8", md: "size-11", lg: "size-12 sm:size-20" };
type Size = keyof typeof sizes;
function Headshot({ profile, size = "md", team = false }: { profile?: AvatarProfile; size?: Size; team?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = safeAvatarUrl(profile?.avatarUrl);
  const Icon = team ? Users : UserRound;
  return <span aria-hidden="true" className={`relative inline-flex ${sizes[size]} shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-blue-50 text-blue-400`}>
    {url && failed !== url ? <img src={url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFailed(url)} /> : <Icon className="size-1/2" />}
  </span>;
}
export function PlayerAvatar({ target, size = "md" }: { target: AvatarTarget; size?: Size }) {
  const profile = avatarProfile(useContext(IdentityContext), target);
  return <Headshot profile={profile} size={size} />;
}
export function PlayerIdentity({ target, name, subtitle, size = "md", centered = false, link = true }: { target: AvatarTarget; name: string; subtitle?: string; size?: Size; centered?: boolean; link?: boolean }) {
  const profile = avatarProfile(useContext(IdentityContext), target);
  const publicLinks = useContext(PublicIdentityContext);
  const href = publicLinks && link && profile && validRobloxId(profile.robloxId) ? playerHref(profile.robloxId) : null;
  const currentName = profile?.displayName || profile?.username;
  return <div className={`flex min-w-0 gap-2 ${centered ? "flex-col items-center text-center" : "items-center text-left"}`}>
    {href ? <Link prefetch={false} href={href} aria-label={`Lihat profil WEJI ARENA ${name}`} className="inline-flex shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-blue-500"><Headshot profile={profile} size={size} /></Link> : <Headshot profile={profile} size={size} />}
    <div className="min-w-0 max-w-full">
      <div className="break-words text-xs font-extrabold text-slate-800 sm:text-sm">{href ? <Link prefetch={false} href={href} className="hover:text-blue-700 hover:underline">{name}</Link> : name}</div>
      {profile ? <>
        {currentName && currentName !== name && <div className="break-words text-[11px] text-slate-600">{currentName}</div>}
        {link && validRobloxId(profile.robloxId) ? <a href={`https://www.roblox.com/users/${profile.robloxId}/profile`} target="_blank" rel="noopener noreferrer" className="break-all text-[11px] font-medium text-blue-700 hover:underline" aria-label={`Buka profil Roblox @${profile.username}`}>@{profile.username}</a> : <div className="break-all text-[11px] text-slate-500">@{profile.username}</div>}
      </> : subtitle ? <div className="break-words text-[11px] text-slate-500">{subtitle}</div> : null}
    </div>
  </div>;
}
export function RankIdentity({ targets, name, subtitle, team, size = "md", centered = false }: { targets: AvatarTarget[]; name: string; subtitle?: string; team: boolean; size?: Size; centered?: boolean }) {
  const profiles = useContext(IdentityContext);
  const publicLinks = useContext(PublicIdentityContext);
  if (!team) return <PlayerIdentity target={targets[0] ?? null} name={name} subtitle={subtitle} size={size} centered={centered} />;
  return <div className={`flex min-w-0 gap-2 ${centered ? "flex-col items-center text-center" : "flex-wrap items-center"}`}>
    <div className="flex max-w-full flex-wrap items-center justify-center -space-x-2" aria-label={`${targets.length} anggota`}>
      {targets.length ? targets.slice(0, 4).map((target, index) => {
        const profile = avatarProfile(profiles, target);
        return publicLinks && profile && validRobloxId(profile.robloxId) ? <Link prefetch={false} key={target ?? index} href={playerHref(profile.robloxId)} className="relative inline-flex rounded-full focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500 hover:z-10" aria-label={`Lihat profil WEJI ARENA @${profile.username}`}><Headshot profile={profile} size="sm" /></Link> : <Headshot key={target ?? index} profile={profile} size="sm" />;
      }) : <Headshot team size="sm" />}
      {targets.length > 4 && <span className="z-10 flex size-8 items-center justify-center rounded-full border border-blue-100 bg-white text-[10px] font-bold text-blue-700">+{targets.length - 4}</span>}
    </div>
    <div className="min-w-0"><div className="break-words text-xs font-extrabold text-slate-800 sm:text-sm">{name}</div>{subtitle && <div className="text-[11px] text-slate-500">{subtitle}</div>}</div>
  </div>;
}
