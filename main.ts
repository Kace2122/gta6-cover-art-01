// Neon Coast Cover Studio — entry program (Node 22, standard library only).
// Hands the static app in: copies app/ and screenshots/ beside this file into
// the output directory and writes /output/dossier.json with the kit's vendored
// dossier builder. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output, e.g. `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

function copyTree(source, dest) {
  if (!existsSync(source)) return 0;
  mkdirSync(dest, { recursive: true });
  cpSync(source, dest, { recursive: true });
  return readdirSync(source).length;
}

function checkShots(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    const info = statSync(file);
    if (info.isFile() && info.size > 262144) {
      throw new Error(`screenshot ${name} is ${info.size} bytes, over the 256 KiB cap`);
    }
  }
}

mkdirSync(outputDir, { recursive: true });
const appEntries = copyTree(join(repoRoot, "app"), join(outputDir, "app"));
const shotEntries = copyTree(join(repoRoot, "screenshots"), join(outputDir, "screenshots"));
checkShots(join(repoRoot, "screenshots"));

// The scorer's own caps: the text budget shapes the dossier bytes, the rest
// refuse an entry the scorer would refuse anyway (too many screenshots, an
// oversize screenshot, app/ over its file or byte caps, a path too long).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, "dossier.json"), dossier);

console.log(
  `Neon Coast handed in: ${appEntries} app entries, ${shotEntries} screenshots, dossier ${dossier.length} bytes -> ${outputDir}`,
);
