// Takes the entry's screenshots with the Playwright headless-shell Chromium:
// serves app/ on localhost, captures each ?shot= scene, then a Python step
// (run after this) shrinks them to JPEGs inside the gate's limits.
// Run: node shots.mjs   (writes screenshots/*.png next to this file)

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const here = fileURLToPath(new URL(".", import.meta.url));
const appDir = join(here, "app");
const shotDir = join(here, "screenshots");
const chrome =
  "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell";

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
    const file = join(appDir, path === "" ? "index.html" : path);
    if (!file.startsWith(appDir) || !existsSync(file)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch (err) {
    res.writeHead(500);
    res.end(String(err));
  }
});

await new Promise((resolve) => server.listen(8091, "127.0.0.1", resolve));
console.log("serving app/ on http://127.0.0.1:8091");

const scenes = [
  { shot: "cover", file: "1-cover.png", w: 1280, h: 720 },
  { shot: "editor", file: "2-editor.png", w: 1280, h: 860 },
  { shot: "portrait", file: "3-cover.png", w: 1024, h: 1280 },
  { shot: "tilted", file: "4-cover.png", w: 1280, h: 720 },
];

for (const scene of scenes) {
  const url = `http://127.0.0.1:8091/index.html?shot=${scene.shot}`;
  const out = join(shotDir, scene.file);
  console.log(`capturing ${scene.shot} -> ${scene.file}`);
  await run(chrome, [
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    `--window-size=${scene.w},${scene.h}`,
    "--virtual-time-budget=12000",
    `--screenshot=${out}`,
    url,
  ]);
  console.log(`  wrote ${out}`);
}

server.close();
console.log("done — now convert the PNGs to JPEGs inside the gate limits");
