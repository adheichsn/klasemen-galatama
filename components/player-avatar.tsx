"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { UserRound, Users } from "lucide-react";
import { avatarProfile, type AvatarProfiles, type AvatarTarget, type AvatarProfile } from "@/lib/avatar-identity";
import { safeAvatarUrl, validRobloxId } from "@/lib/player-identity";
const IdentityContext = createContext<AvatarProfiles>({});
export function AvatarScope({ profiles, children }: { profiles: AvatarProfiles; children: ReactNode }) {
  return <IdentityContext.Provider value={profiles}>{children}</IdentityContext.Provider>;
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
  const currentName = profile?.displayName || profile?.username;
  return <div className={`flex min-w-0 gap-2 ${centered ? "flex-col items-center text-center" : "items-center text-left"}`}>
    <Headshot profile={profile} size={size} />
    <div className="min-w-0 max-w-full">
      <div className="break-words text-xs font-extrabold text-slate-800 sm:text-sm">{name}</div>
      {profile ? <>
        {currentName && currentName !== name && <div className="break-words text-[11px] text-slate-600">{currentName}</div>}
        {link && validRobloxId(profile.robloxId) ? <a href={`https://www.roblox.com/users/${profile.robloxId}/profile`} target="_blank" rel="noopener noreferrer" className="break-all text-[11px] font-medium text-blue-700 hover:underline" aria-label={`Buka profil Roblox @${profile.username}`}>@{profile.username}</a> : <div className="break-all text-[11px] text-slate-500">@{profile.username}</div>}
      </> : subtitle ? <div className="break-words text-[11px] text-slate-500">{subtitle}</div> : null}
    </div>
  </div>;
}
export function RankIdentity({ targets, name, subtitle, team, size = "md", centered = false }: { targets: AvatarTarget[]; name: string; subtitle?: string; team: boolean; size?: Size; centered?: boolean }) {
  const profiles = useContext(IdentityContext);
  if (!team) return <PlayerIdentity target={targets[0] ?? null} name={name} subtitle={subtitle} size={size} centered={centered} />;
  return <div className={`flex min-w-0 gap-2 ${centered ? "flex-col items-center text-center" : "flex-wrap items-center"}`}>
    <div className="flex max-w-full flex-wrap items-center justify-center -space-x-2" aria-label={`${targets.length} anggota`}>
      {targets.length ? targets.slice(0, 4).map((target, index) => <Headshot key={target ?? index} profile={avatarProfile(profiles, target)} size="sm" />) : <Headshot team size="sm" />}
      {targets.length > 4 && <span className="z-10 flex size-8 items-center justify-center rounded-full border border-blue-100 bg-white text-[10px] font-bold text-blue-700">+{targets.length - 4}</span>}
    </div>
    <div className="min-w-0"><div className="break-words text-xs font-extrabold text-slate-800 sm:text-sm">{name}</div>{subtitle && <div className="text-[11px] text-slate-500">{subtitle}</div>}</div>
  </div>;
}
