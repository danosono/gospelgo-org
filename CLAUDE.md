# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the static marketing/hub site for Gospelgo (gospelgo.org), a Christian indie game studio. It is a hand-written, multi-page static HTML site (no build step, no framework, no package.json). It links out to the actual games, which are hosted as separate Unity WebGL deployments on their own subdomains (e.g. `word.gospelgo.org`, `bigheart.gospelgo.org`, `play.gospelgo.org`, `bubbleshooter.gospelgo.org`, `bible-explorer.gospelgo.org`).

Deployed via Netlify with continuous deployment from `main`.

## Running locally

There is no build/test/lint tooling. Use the VS Code "Live Server" extension (configured in `.vscode/settings.json`, port 5501) or any static file server to preview pages — just open the relevant `index.html`.

## Site structure

- Every page lives in its own directory as `<page-name>/index.html` (e.g. `about/index.html`, `feedback/index.html`), so links resolve cleanly to `/page-name/`. The root `index.html` is the homepage.
- `components/` contains reference/snippet HTML for UI patterns (buttons, cards, footers, nav, etc.) used as a library to copy from — these are not included/templated at build time, they're just copy-paste references. **`components/new-page.html` is the starting template for any new page** (header/nav, content placeholder section, gospel callout, full footer, scripts).
- `css/style.css` is the single global stylesheet (BEM naming: `.block__element--modifier`). `css/normalize.css` is a vendor reset. `:root` defines the color/spacing custom properties used throughout.
- `js/main.js` is the single global script, included on every page. It handles: collapsible nav/footer sections, an image lightbox (`.lightbox-trigger` + `data-lightbox-src`), copy-to-clipboard for share blurbs, and the public leaderboard widgets (see below).
- `images/` holds all site assets (icons, screenshots, logos, the `sprite.svg` icon sheet referenced via `<use href="...sprite.svg#name">`).
- `netlify/functions/` contains Netlify serverless functions:
  - `form-discord.js` — handles the feedback form POST (`/.netlify/functions/form-discord`). Does honeypot check, max-length check, a banned-word filter that routes flagged messages to a separate Discord webhook, and Cloudflare Turnstile verification before posting to Discord.
  - `deploy-discord.js` — posts a "deploy succeeded" notification to Discord on Netlify deploy.
  - Both rely on env vars (`DISCORD_WEBHOOK_URL`, `DISCORD_FORM_WEBHOOK_URL`, `DISCORD_SPAM_WEBHOOK_URL`, `TURNSTILE_SECRET_KEY`) configured in Netlify, not in the repo.

## Page conventions

When adding a new page, copy `components/new-page.html` as a starting point and:
- Keep the standard `<head>`: Google Fonts (Inter), `../css/normalize.css`, `../css/style.css`, AOS animation library CSS/JS, favicon (`../Gg.png`), and the usual `og:*` meta tags (update `og:title`, `og:description`, `og:url`).
- Pages live one directory deep, so all asset/links paths use `../` (e.g. `../images/...`, `../css/style.css`). The homepage (`index.html` at root) uses non-relative paths (`images/...`, `css/style.css`).
- Reuse the shared header `<nav class="nav collapsible">` and footer `<footer class="block block--dark footer">` blocks verbatim from another page (e.g. `about/index.html`) so nav links and footer columns (Games, Bible Apps, Company, Support, Community) stay consistent across the site. If a page corresponds to one of the nav/footer links, mark that link `class="disabled-link"` (current-page convention, see `feedback/index.html` and `leaderboards/index.html`).
- End every page with `<script src="../js/main.js"></script>` plus the AOS script tag and `AOS.init();` unless the page intentionally opts out (e.g. `reset-password/index.html`, which is a standalone minimal page with inline styles/script and no shared nav/footer).

## Supabase integration

The site talks directly to a shared Supabase project (URL and anon key are hardcoded in `js/main.js` and `reset-password/index.html` — this is the public anon key, intentionally client-exposed) for:
- **Public leaderboards** (`leaderboards/word/`, `leaderboards/bubble-shooter/`): rendered by `js/main.js` via `data-leaderboard="word"|"bubble"` containers calling Supabase RPCs `word_top_wpm` / `bubble_top_overall`. To add a new leaderboard, add a container with `data-leaderboard`, `data-leaderboard-list`, `data-leaderboard-status`, `data-limit`, `data-refresh-ms`, and a matching RPC + render function in `js/main.js`.
- **Password reset** (`reset-password/index.html`): standalone page that reads the Supabase recovery `access_token` from the URL hash and PUTs a new password to `/auth/v1/user`. This page is the shared password-reset landing page for *all* Gospelgo games (they all use one Supabase auth project/player identity) — see the global `gospel-go-auth.md` rules for the cross-game auth/session architecture; this site only hosts the reset-password UI, not game session logic.

## Content/tone notes

- This is a faith-based project; pages routinely include scripture quotes and "gospel callout" sections (`callout--primary callout--footer` block linking to a gospel video) — follow this pattern when adding new pages rather than omitting it.
- Several support/resource pages exist for sensitive topics (`suicide/`, `human-trafficking-help/`, `sex-trafficking-help/`, `forced-labor-help/`, `being-trafficked/`, `trafficked/`) — preserve their tone and resource links carefully if editing.
