// Assembles the deployable static site into site/.
//
// The app has no bundler: index.html loads src/*.js as ES modules with
// relative paths, so a "build" is just copying the page and its src/ assets
// into a self-contained directory the host can serve from a subpath
// (apps.charliekrug.com/bankroll/). Run with: node scripts/build-site.mjs

import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "site");

// Relative asset paths only, so everything the page references must live
// under site/ at the same relative location it has in the repo root.
const assets = ["index.html", "src"];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const asset of assets) {
  await cp(join(root, asset), join(out, asset), { recursive: true });
}

console.log(`Built site/ from ${assets.join(", ")}`);
