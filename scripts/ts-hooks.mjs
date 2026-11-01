// Lets a script run the app's TypeScript: Node (22.18 and later) strips the
// types itself, and this points the app's "./x.js" imports at "./x.ts".
//   node --import ./scripts/ts-hooks.mjs scripts/demo-snapshots.mjs
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && specifier.endsWith(".js") && context.parentURL?.endsWith(".ts")) {
      const ts = new URL(specifier.replace(/\.js$/, ".ts"), context.parentURL);
      if (existsSync(fileURLToPath(ts))) return nextResolve(ts.href, context);
    }
    return nextResolve(specifier, context);
  },
});
