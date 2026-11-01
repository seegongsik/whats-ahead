/**
 * A demo street saved from the deployment's own answers (the street and Muse
 * Spark Open's picks for it), so it opens at once wherever it is opened: the
 * CDN does not keep the live answers for long (D51). Saved by
 * `npm run snapshot:demo`; a street from a photo is always looked up live.
 */
import type { Picks } from "./picks.js";
import type { StreetAhead } from "./street.js";

export type DemoSnapshot = {
  /** The demo street's id (`famous.ts`). */
  id: string;
  /** When it was saved, ISO time. */
  savedAt: string;
  /** The deployment whose answers were saved. */
  from: string;
  /** The model that made the picks, and how long it took when it made them. */
  model?: string;
  latencyMs?: number;
  picks: Picks;
  street: StreetAhead;
};

/** Where the page finds a demo street's snapshot. */
export function snapshotPath(id: string): string {
  return `/demo/streets/${encodeURIComponent(id)}.json`;
}

/** The day it was saved, as the page shows it ("2026-11-01"). */
export function snapshotDay(savedAt: string): string {
  return savedAt.slice(0, 10);
}

/**
 * A snapshot read from its JSON, or null when it is not a sound one for this
 * demo street: the live lookup is used then. Every pick must name a place on
 * the saved street, so the two were saved together.
 */
export function readSnapshot(value: unknown, id: string): DemoSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Partial<DemoSnapshot>;
  if (s.id !== id || typeof s.savedAt !== "string" || Number.isNaN(Date.parse(s.savedAt)) || typeof s.from !== "string") return null;
  const street = s.street as Partial<StreetAhead> | undefined;
  if (!street || street.synthetic !== false || !street.route || !Array.isArray(street.route.points) || street.route.points.length < 2) return null;
  if (!Array.isArray(street.shops) || street.shops.length === 0 || (street.notes ?? []).length > 0) return null;
  const picks = s.picks;
  if (!picks || !Array.isArray(picks.landmarks) || picks.landmarks.length === 0 || !picks.best || typeof picks.best !== "object") return null;
  const ids = new Set(street.shops.map((shop) => shop.id));
  const named = [...picks.landmarks.map((l) => l?.id), ...Object.values(picks.best).flat()];
  if (!named.every((pid) => typeof pid === "string" && ids.has(pid))) return null;
  return s as DemoSnapshot;
}

/** A demo street's snapshot from the deployment, or null (none, unreadable, or not this street's). */
export async function fetchSnapshot(id: string, signal?: AbortSignal): Promise<DemoSnapshot | null> {
  try {
    const res = await fetch(snapshotPath(id), { signal });
    if (!res.ok) return null;
    return readSnapshot(await res.json(), id);
  } catch {
    return null;
  }
}
