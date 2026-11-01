// The demo streets the deployment serves from snapshots (D51): one for each,
// sound, saved with Muse Spark's picks for that very street, and with the data
// fixes the server makes. Made by `npm run snapshot:demo`.
import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readSnapshot, snapshotDay, snapshotPath, type DemoSnapshot } from "../src/street/demo-snapshot.js";
import { leftOut } from "../src/street/errata.js";
import { FAMOUS_STREETS } from "../src/street/famous.js";
import { syntheticStreet } from "../src/street/synthetic.js";

const file = (id: string) => new URL(`../public${snapshotPath(id)}`, import.meta.url);

describe("demo street snapshots", () => {
  it.each(FAMOUS_STREETS.map((s) => [s.id] as const))("%s: saved, sound, and as the server would serve it", (id) => {
    const snapshot = readSnapshot(JSON.parse(readFileSync(file(id), "utf8")), id);
    expect(snapshot).not.toBeNull();
    const { street, picks, savedAt } = snapshot!;
    // Light enough to open at once.
    expect(statSync(file(id)).size).toBeLessThan(400_000);
    // Saved from the deployment, not in the future.
    expect(snapshot!.from).toMatch(/^https:\/\//);
    expect(Date.parse(savedAt)).toBeLessThanOrEqual(Date.now());
    // A street that runs, with places and enough landmarks to stop at.
    expect(street.route.length).toBeGreaterThan(900);
    expect(street.shops.length).toBeGreaterThan(50);
    expect(picks.landmarks.length).toBeGreaterThanOrEqual(3);
    // The data's known errors stay out, as on the server (src/street/errata.ts).
    expect(street.shops.filter((shop) => leftOut(shop)).map((shop) => shop.name)).toEqual([]);
  });

  it("reads only a sound snapshot of the street asked for", () => {
    const street = { ...syntheticStreet(), synthetic: false };
    const [a, b] = street.shops;
    const sound: DemoSnapshot = {
      id: "fifth-avenue",
      savedAt: "2026-11-01T04:31:00.000Z",
      from: "https://whats-ahead.vercel.app",
      picks: { landmarks: [{ id: a.id, why: "iconic" }], best: { cafe: [b.id] } },
      street,
    };
    expect(readSnapshot(sound, "fifth-avenue")).toBe(sound);
    expect(snapshotDay(sound.savedAt)).toBe("2026-11-01");
    expect(snapshotPath("champs-elysees")).toBe("/demo/streets/champs-elysees.json");
    // Another street's, a pick that is not a place on it, invented data, a fallback, no date: the live lookup instead.
    expect(readSnapshot(sound, "ginza")).toBeNull();
    expect(readSnapshot({ ...sound, picks: { landmarks: [{ id: "elsewhere", why: "iconic" }], best: {} } }, "fifth-avenue")).toBeNull();
    expect(readSnapshot({ ...sound, picks: { ...sound.picks, best: { cafe: ["elsewhere"] } } }, "fifth-avenue")).toBeNull();
    expect(readSnapshot({ ...sound, street: syntheticStreet() }, "fifth-avenue")).toBeNull();
    expect(readSnapshot({ ...sound, street: { ...street, notes: ["Overture did not answer"] } }, "fifth-avenue")).toBeNull();
    expect(readSnapshot({ ...sound, savedAt: "yesterday" }, "fifth-avenue")).toBeNull();
    expect(readSnapshot(null, "fifth-avenue")).toBeNull();
  });
});
