import "server-only";
import { cache } from "react";
import { publicEvents } from "./public-events";
import { publicAvatarProfiles } from "./avatar-identity-db";
import { buildPlayerDirectory, playerHref } from "./player-directory";
import { validRobloxId } from "./player-identity";
import { validBannerUrl } from "./banner";
import {
  eventSeoAllowed,
  eventSeoPath,
  indexableEvent,
  cleanSeoText,
  type EventPageKind,
} from "./seo-core";
import { nonIndexMetadata, pageMetadata } from "./seo";

export const publicSeoDirectory = cache(async () => {
  const { events, unavailable } = await publicEvents();
  if (unavailable) return { events, players: [], unavailable: true };
  // Only index participants of publicly visible LIVE or FINISHED events.
  const eligible = events.filter(indexableEvent);
  let identityUnavailable = false;
  const profiles = await publicAvatarProfiles(eligible, () => {
    identityUnavailable = true;
  });
  return {
    events,
    players: buildPlayerDirectory(eligible, profiles),
    unavailable: identityUnavailable,
  };
});
export async function eventMetadata(id: string, kind: EventPageKind) {
  const { events, unavailable } = await publicEvents();
  const event = events.find((e) => e.id === id && e.published && !e.trashedAt);
  if (
    unavailable ||
    !event ||
    (kind === "hasil" && event.status !== "finished")
  )
    return { ...nonIndexMetadata, title: "Turnamen tidak tersedia" };
  const prefix =
    kind === "hasil"
      ? "Hasil Final "
      : kind === "statistik"
        ? "Statistik "
        : "";
  const detail =
    kind === "hasil"
      ? "Klasemen final dan podium resmi"
      : kind === "statistik"
        ? "Statistik poin dan tangkapan"
        : "Informasi, peraturan, dan klasemen turnamen";
  return pageMetadata({
    title: cleanSeoText(`${prefix}${event.title}`, 100),
    description: `${detail} ${event.title} di ${event.location || "WEJI ARENA"}. Mode ${event.mode.toUpperCase()}. ${kind === "detail" ? event.subtitle : ""}`,
    path: eventSeoPath(id, kind),
    image:
      event.bannerUrl && validBannerUrl(event.bannerUrl)
        ? event.bannerUrl
        : undefined,
    index: eventSeoAllowed(event, kind),
  });
}
export async function playerMetadata(id: string) {
  if (!validRobloxId(id))
    return { ...nonIndexMetadata, title: "Profil tidak tersedia" };
  const { players, unavailable } = await publicSeoDirectory();
  const player = players.find((p) => p.profile.robloxId === id);
  if (unavailable || !player)
    return { ...nonIndexMetadata, title: "Profil pemain" };
  const p = player.profile;
  return pageMetadata({
    title: cleanSeoText(`${p.displayName} (@${p.username})`, 100),
    description: `Profil Roblox ${p.displayName} (@${p.username}) di WEJI ARENA. Lihat riwayat turnamen, statistik, dan pencapaian pemain.`,
    path: playerHref(id),
  });
}
