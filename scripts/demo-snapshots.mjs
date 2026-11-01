// Saves each demo street as the deployment answers it now, the street and
// Muse Spark Open's picks for it, into public/demo/streets/<id>.json, for the
// page to open at once wherever it is opened (D51). Run it against the
// deployment, check the output, and commit the files:
//   npm run snapshot:demo [-- https://whats-ahead.vercel.app]
// Needs Node 22.18 or later, which reads the app's TypeScript directly
// (with scripts/ts-hooks.mjs for its imports).
import { mkdir, writeFile } from "node:fs/promises";
import { FAMOUS_STREETS } from "../src/street/famous.ts";
import { readSnapshot } from "../src/street/demo-snapshot.ts";
import { leftOut, rightName } from "../src/street/errata.ts";

const base = (process.argv[2] ?? "https://whats-ahead.vercel.app").replace(/\/+$/, "");
const out = new URL("../public/demo/streets/", import.meta.url);
await mkdir(out, { recursive: true });

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${url} answered ${res.status}: ${body.error ?? ""}`);
  return { body, cache: res.headers.get("x-vercel-cache") ?? "-" };
}

let failed = 0;
for (const demo of FAMOUS_STREETS) {
  try {
    // The same question the page asks for this demo street.
    const query = new URLSearchParams({ lat: String(demo.lat), lon: String(demo.lon), heading: String(demo.headingDeg) });
    if (demo.street) query.set("street", demo.street);
    const [street, picks] = await Promise.all([getJson(`${base}/api/street?${query}`), getJson(`${base}/api/landmarks?demo=${encodeURIComponent(demo.id)}`)]);
    if ((street.body.notes ?? []).length > 0) throw new Error(`the street fell back: ${street.body.notes.join("; ")}`);
    // The server's own fixes (src/street/errata.ts), in case the deployment is older than the list: a place left out takes its picks with it.
    const shops = street.body.shops.filter((shop) => !leftOut(shop)).map((shop) => rightName(shop));
    const kept = new Set(shops.map((shop) => shop.id));
    const dropped = street.body.shops.filter((shop) => !kept.has(shop.id)).map((shop) => shop.name);
    const model = picks.body.picks;
    const snapshot = {
      id: demo.id,
      savedAt: new Date().toISOString(),
      from: base,
      model: picks.body.model,
      latencyMs: picks.body.latencyMs,
      picks: {
        landmarks: model.landmarks.filter((l) => kept.has(l.id)),
        best: Object.fromEntries(Object.entries(model.best).map(([group, ids]) => [group, ids.filter((id) => kept.has(id))])),
      },
      street: { ...street.body, shops },
    };
    if (dropped.length > 0) console.log(`${demo.id}: left out as the server does: ${dropped.join(", ")}`);
    if (!readSnapshot(snapshot, demo.id)) throw new Error("the street and its picks do not match (saved at different times?); run again");
    const text = JSON.stringify(snapshot);
    await writeFile(new URL(`${demo.id}.json`, out), text);
    const names = snapshot.picks.landmarks.map((l) => street.body.shops.find((s) => s.id === l.id)?.name).join(", ");
    console.log(`${demo.id}: ${snapshot.street.shops.length} places, ${(street.body.route.length / 1000).toFixed(1)} km, ${(text.length / 1024).toFixed(0)} KB (street ${street.cache}, picks ${picks.cache}); landmarks: ${names}`);
  } catch (error) {
    failed += 1;
    console.error(`${demo.id}: not saved: ${error instanceof Error ? error.message : String(error)}`);
  }
}
process.exit(failed > 0 ? 1 : 0);
