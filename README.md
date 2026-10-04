# Murmur

![Murmur: ask what happens next](site/og.png)

**Live site:** https://chndr-prksh.github.io/murmur/

Ask what happens next. Murmur researches a question with current news, forecasts the outcomes, and simulates how one million people react.

## How it works

1. **Research and framing** (`worker/`): a Cloudflare Worker calls Claude with web search. Claude finds the closest past events, defines 5 to 8 checkable outcomes and 5 to 8 audience groups, and estimates a probability for each outcome.
2. **Panel**: the same brief goes to several independent Claude samples. Their probabilities are averaged, and the lowest and highest are kept as the range.
3. **Evidence tone** (optional): [Laya](https://github.com/NandhaKishorM/laya), a small open decision model, scores each source as critical, neutral or supportive, independently of Claude. Its reading is shown on the page and passed to the panel as one signal.
4. **Population simulation** (`site/sim-worker.js`): the per-audience rates (how many hear about it, how they split, how many pass it on) drive a spread model of 1,000,000 simulated people, run 20 times in the visitor's browser.
5. **Record**: every forecast is saved with its timestamp so it can be scored later.

The probabilities are model judgement and the population figures are a simulation. Neither is a measurement, and forecast accuracy has not been backtested yet.

## Layout

| Path | What it is |
|---|---|
| `site/` | Static front end, no build step. Deployed to GitHub Pages by `.github/workflows/pages.yml`. |
| `worker/` | Cloudflare Worker that holds the API key and produces forecasts. |

Without a backend URL in `site/config.js`, the site runs on a hand-written sample forecast and says so on the page.

## Run the site locally

```bash
python3 -m http.server 4173 --directory site
```

## Deploy the backend

```bash
cd worker
npm install
npx wrangler kv namespace create FORECASTS   # paste the id into wrangler.toml
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

Then set `ALLOWED_ORIGINS` in `worker/wrangler.toml` to your site's URL, redeploy, and put the worker URL in `site/config.js`.

### Laya (optional)

Laya needs its own host with Python; it cannot run inside the Worker. `laya-server/` holds a container image for Google Cloud Run.

```bash
pip install "laya[serve]"
laya-serve   # listens on port 8000
```

Put that server's public URL in `LAYA_URL` in `worker/wrangler.toml`. If it is unset or unreachable the step is skipped and the forecast still completes.

Each new question makes one web-search call and several panel calls to Claude Opus 5.5. `DAILY_LIMIT` caps new questions per visitor per day and repeated questions are served from cache for six hours.

## Licence

MIT
