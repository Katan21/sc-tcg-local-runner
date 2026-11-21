# SC-TCG Local Runner

Integrity-checked local run + UI-layer package for the SC-TCG (Star Citizen
Turkish community) fan site — built for a security review, with a strict rule:
**the original 225 site files are never modified.**

## What it does

- `server.js` — dependency-free Node.js server that serves a local copy of the
  site and injects an overlay (custom CSS boot + JS boot) into `index.html`
  **in memory**; the on-disk originals stay byte-identical (verified with
  SHA-256).
- `/v2/` route serves a restyled variant; `?noInject=1` serves the untouched
  page for A/B comparison.
- `v2/v2.css` + `v2/v2-boot.js` — the overlay layer (~485 CSS rule overrides,
  sidebar→topbar remap) without touching the original stylesheet.
- `baslat.bat` / `baslat-v2.bat` / `kapat.bat` — one-click start/stop on
  Windows (port 4173), LAN mode for phone testing (`baslat-telefon.bat`).
- `durum.js` — health/status checker.

## Findings made during the review (reported upstream)

- TDZ (temporal dead zone) bug in `pack.js` (`qsaLeaderboardData` used before
  definition) — leaderboard path breaks in strict engines
- `commArray` null-style handling defect
- 3 referenced-but-missing assets (image + audio)

> The site files themselves are **not** included (community/copyright). Clone
> or copy your own local mirror into `./site/` and run `node server.js`.
> See `README-LOCAL.md` (Turkish) for full details, including the Supabase
> data-flow note and the offline switch.
