# Neon Coast Cover Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun)
[![rank](https://make.fun/badge/gta6-cover-art-01/Kace2122/gta6-cover-art-01/rank.svg)](https://make.fun)
[![reward](https://make.fun/badge/gta6-cover-art-01/Kace2122/gta6-cover-art-01/reward.svg)](https://make.fun)

A GTA 6-style cover maker for the [make.fun](https://make.fun) `gta6-cover-art-01`
competition. It turns any photo and a caption into a multi-panel poster in the
Vice City neon-sunset style — and exports it as a PNG to share. Everything runs
offline in the browser: your photos never leave your machine.

## What it does

- **Your photos, or the samples** — load photos from your machine into three
  slots, or use the two bundled model-made samples (boulevard, pier).
- **Six layouts** — nine-panel grid, hero + three, four-panel grid, full bleed,
  tilted snapshots, classic poster with a halftone title block.
- **Per-panel crop** — click a panel, drag it to reposition its crop, scroll or
  slide to zoom; fill several panels with one photo or several.
- **Five grades** — Sunset, Neon, Vice, Gold and Noir, each a filter plus a
  sunset/neon wash over the poster.
- **Lettering** — an Anton caption in bold capitals with a Pacifico neon script
  subtitle (both vendored under the SIL Open Font License in `app/fonts/`).
- **Finish** — film grain, vignette, inked white panel frames.
- **Undo / redo** — every change, with Ctrl+Z / Ctrl+Shift+Z.
- **Export PNG** — 1080 x 1080, 1080 x 1350, 1920 x 1080 and 1080 x 1920,
  one at a time or all four at once.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `app/index.html` and everything it loads
lives under `app/`.

## Handing it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`buildDossier` from `vendor/makefun-app.ts`.

## Originality

Everything here is original: no Rockstar Games logo, artwork, wordmark,
character or font. The sample photos were made with an image model for
make.fun and are free to use; the Anton and Pacifico fonts ship under the SIL
Open Font License (see `app/fonts/OFL-Anton.txt` and `app/fonts/OFL-Pacifico.txt`).
