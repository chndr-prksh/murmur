# Murmur: AI news forecasting and public reaction simulator

![Murmur: ask what happens next](site/og.png)

**Live site:** https://chndr-prksh.github.io/murmur/

Ask what happens next. Murmur researches a question with current news, forecasts the outcomes, and simulates how one million people react, all from a static web page backed by a small Cloudflare Worker that calls Claude.

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Project layout](#project-layout)
- [Run the site locally](#run-the-site-locally)
- [Deploy the backend](#deploy-the-backend)
- [Configuration](#configuration)
- [API](#api)
- [Licence](#licence)

## What it does

Type a question such as "what happens if X announces Y?" and Murmur returns:

- **News-grounded research**: Claude searches the web for current coverage and the closest past events.
- **Checkable outcomes with probabilities**: 5 to 8 concrete outcomes, each with an averaged probability and a low-to-high range from several independent model samples.
- **Audience groups**: 5 to 8 groups of people, with how many hear about it, how they split for and against, and how many pass it on.
- **A one-million-person simulation**: a spread model of 1,000,000 simulated people, run 20 times in your browser in a Web Worker, so the reaction curves are computed on your machine.
- **Optional evidence tone**: an independent second opinion on whether each news source is critical, neutral or supportive, from the open [Laya](https://github.com/NandhaKishorM/laya) decision model.
- **Shareable results**: every forecast is saved and gets its own `?f=<id>` link.

## How it works

1. **Research and framing** (`worker/`): a Cloudflare Worker calls Claude with web search. Claude finds the closest past events, defines 5 to 8 checkable outcomes and 5 to 8 audience groups, and estimates a probability for each outcome.
2. **Panel**: the same brief goes to several independent Claude samples. Their probabilities are averaged, and the lowest and highest are kept as the range.
3. **Evidence tone** (optional): [Laya](https://github.com/NandhaKishorM/laya), a small open decision model, scores each source as critical, neutral or supportive, independently of Claude. Its reading is shown on the page and passed to the panel as one signal.
4. **Population simulation** (`site/sim-worker.js`): the per-audience rates (how many hear about it, how they split, how many pass it on) drive a spread model of 1,000,000 simulated people, run 20 times in the visitor's browser.
5. **Record**: every forecast is saved with its timestamp so it can be scored later.

The probabilities are model judgement and the population figures are a simulation. Neither is a measurement, and forecast accuracy has not been backtested yet.

## Project layout

| Path | What it is |
|---|---|
| `site/` | Static front end, no build step. Deployed to GitHub Pages by `.github/workflows/pages.yml`. |
| `site/sim-worker.js` | The in-browser population simulation. |
| `worker/` | Cloudflare Worker that holds the API key and produces forecasts. |
| `laya-server/` | Optional container image that runs Laya on Google Cloud Run. |

Without a backend URL in `site/config.js`, the site runs on a hand-written sample forecast and says so on the page.

## Run the site locally

```bash
python3 -m http.server 4173 --directory site
```

Then open http://localhost:4173. `http://localhost:4173` is already in the worker's allowed origins, so a local site can talk to a deployed worker.

## Deploy the backend

```bash
cd worker
npm install
npx wrangler kv namespace create FORECASTS   # paste the id into wrangler.toml
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

Then set `ALLOWED_ORIGINS` in `worker/wrangler.toml` to your site's URL, redeploy, and put the worker URL in `site/config.js`. For local worker development, `npm run dev` runs `wrangler dev`.

### Laya (optional)

Laya needs its own host with Python; it cannot run inside the Worker. `laya-server/` holds a container image for Google Cloud Run (see [`laya-server/README.md`](laya-server/README.md)).

```bash
pip install "laya[serve]"
laya-serve   # listens on port 8000
```

Put that server's public URL in `LAYA_URL` in `worker/wrangler.toml`. If it is unset or unreachable the step is skipped and the forecast still completes.

### Cost and limits

Each new question makes one web-search call and several panel calls to Claude Opus 5.5. `DAILY_LIMIT` caps new questions per visitor per day and repeated questions are served from cache for six hours.

## Configuration

Set in `worker/wrangler.toml` under `[vars]`, or as Wrangler secrets:

| Setting | Default | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` (secret) | — | Claude API key. Set with `npx wrangler secret put ANTHROPIC_API_KEY`. |
| `ALLOWED_ORIGINS` | GitHub Pages URL and `http://localhost:4173` | Comma-separated origins allowed to call the API. |
| `DAILY_LIMIT` | `5` | New questions each visitor may ask per day. |
| `SAMPLES` | `3` | Independent forecaster samples averaged per question (1 to 6). |
| `LAYA_URL` | empty | Base URL of a `laya-serve` instance. Empty skips evidence scoring. |
| `LAYA_API_KEY` (secret, optional) | — | Bearer token if your Laya server needs one. |

On the front end, `site/config.js` sets `window.MURMUR_API` to the worker URL.

## API

The worker exposes two endpoints:

| Method and path | Purpose |
|---|---|
| `POST /api/forecast` | Body `{"question": "..."}` (8 to 300 characters). Returns a new forecast, or the cached one if the same question was asked in the last six hours. |
| `GET /api/forecast/<id>` | Returns a saved forecast by its 16-character id. |

## Licence

[MIT](LICENSE)
