(function () {
  const API = (window.MURMUR_API || '').replace(/\/$/, '');
  const DEMO = window.MURMUR_DEMO;
  const POPULATION = 1000000, RUNS = 20, CONTACTS = 8, HOMOPHILY = 0.8;
  const EXAMPLES = [
    DEMO.question,
    'What if a major streaming service doubles its price overnight?',
    'What if a country bans social media for under-16s?',
  ];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (v, digits = 0) => (v * 100).toFixed(digits) + '%';
  const num = (v) => Math.round(v).toLocaleString('en-US');
  const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Counts a number up to its value. Used for the headline counters and percentages.
  function tween(el, to, format = num, ms = 900) {
    if (reduced || document.hidden) { el.textContent = format(to); return; }
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      el.textContent = format(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Panels fade up as they scroll into view.
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); } });
  }, { threshold: 0.12 });

  const web = new window.MurmurWeb($('web'));
  const tip = $('tip');
  let sim = null, horizon = 14;

  web.onDay = (day) => { $('hud-day').textContent = `Day ${day} of ${horizon}`; };
  $('replay').addEventListener('click', () => web.play());

  // One shared tooltip, positioned at the pointer and kept inside the viewport.
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - r.width - 8, x + 14) + 'px';
    tip.style.top = Math.min(window.innerHeight - r.height - 8, y + 14) + 'px';
  }
  const hideTip = () => { tip.hidden = true; };
  function hover(el, html) {
    el.addEventListener('pointermove', (e) => showTip(html, e.clientX, e.clientY));
    el.addEventListener('pointerleave', hideTip);
  }

  function setNote(text, isError) {
    $('note').textContent = text;
    $('note').classList.toggle('err', !!isError);
  }

  function chips() {
    $('chips').innerHTML = '';
    EXAMPLES.forEach((text) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = text;
      b.addEventListener('click', () => { $('q').value = text; $('ask').requestSubmit(); });
      $('chips').appendChild(b);
    });
  }

  // Shares must sum to 1 and each audience's stance split must fit inside 1.
  function cleanSegments(segments) {
    const total = segments.reduce((t, g) => t + clamp01(g.share), 0) || 1;
    return segments.map((g) => {
      let support = clamp01(g.support), oppose = clamp01(g.oppose);
      const over = support + oppose;
      if (over > 1) { support /= over; oppose /= over; }
      return { ...g, share: clamp01(g.share) / total, reach: clamp01(g.reach), support, oppose, amplify: clamp01(g.amplify) };
    });
  }

  function renderOutcomes(outcomes) {
    const box = $('outcomes');
    box.innerHTML = '';
    [...outcomes].sort((a, b) => b.p - a.p).forEach((o) => {
      const p = clamp01(o.p), lo = Math.min(p, clamp01(o.lo ?? p)), hi = Math.max(p, clamp01(o.hi ?? p));
      const row = document.createElement('div');
      row.className = 'out';
      row.innerHTML =
        `<div class="out-label">${esc(o.label)}</div>` +
        `<div class="track"><div class="fill" data-w="${p * 100}"></div>` +
        (hi - lo > 0.005 ? `<div class="whisker" style="left:${lo * 100}%;width:${(hi - lo) * 100}%"></div>` : '') +
        `</div><div class="out-val">${pct(p)}</div>`;
      hover(row, `<b>${pct(p)}</b> (range ${pct(lo)} to ${pct(hi)})<br>${esc(o.rationale)}`);
      box.appendChild(row);
      tween(row.querySelector('.out-val'), p, (v) => pct(v), 1100);
    });
    // Bars grow from zero once the rows are in the page. A timer, not an
    // animation frame, so they still fill in a background tab.
    setTimeout(() => {
      box.querySelectorAll('.fill').forEach((el) => { el.style.width = el.dataset.w + '%'; });
      box.classList.add('drawn');
    }, 60);
  }

  function renderSegments(segments) {
    const box = $('segments');
    box.innerHTML = '';
    segments.forEach((g) => {
      const neutral = Math.max(0, 1 - g.support - g.oppose);
      const row = document.createElement('div');
      row.className = 'seg';
      row.innerHTML =
        `<div class="seg-head"><span>${esc(g.name)}</span>` +
        `<span class="seg-meta">${pct(g.share)} of people · ${pct(g.reach)} hear</span></div>` +
        `<div class="stack"><i class="support" style="flex:${g.support}"></i>` +
        `<i class="neutral swatch" style="flex:${neutral};height:auto;width:auto"></i>` +
        `<i class="oppose" style="flex:${g.oppose}"></i></div>` +
        `<p class="seg-text">${esc(g.reaction)}</p>`;
      hover(row.querySelector('.stack'),
        `<b>${esc(g.name)}</b><br>Supports ${pct(g.support)} · Neutral ${pct(neutral)} · Opposes ${pct(g.oppose)}<br>Passes it on: ${pct(g.amplify)}`);
      box.appendChild(row);
    });
  }

  function renderLists(f) {
    $('analogues').innerHTML = (f.analogues || []).map((a) =>
      `<li><b>${esc(a.event)}${a.year ? ` (${esc(a.year)})` : ''}</b><br>${esc(a.what_happened)}</li>`).join('');
    $('drivers').innerHTML = (f.drivers || []).map((d) => `<li>${esc(d)}</li>`).join('');
    const sources = (f.sources || []).filter((s) => /^https?:\/\//i.test(s.url));
    $('sources').innerHTML = sources.length
      ? sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title || s.url)}</a></li>`).join('')
      : '<li>No live sources: this is the built-in sample.</li>';
  }

  // Laya's reading of the evidence. Hidden on live forecasts made without it.
  function renderLaya(f, demo) {
    const laya = f.laya;
    $('laya-panel').hidden = !laya && !demo;
    $('laya-body').hidden = !laya;
    if (!laya) {
      $('laya-lead').textContent = 'On live forecasts, Laya (an open decision model) scores whether each source Claude read is critical, neutral or supportive. It does not run on the sample.';
      return;
    }
    const t = laya.tone;
    $('laya-lead').textContent = `Laya, an open decision model, scored ${laya.items.length} reports independently of Claude.`;
    $('laya-bar').innerHTML =
      `<i class="support" style="flex:${t.supportive}"></i><i class="neutral swatch" style="flex:${t.neutral};height:auto;width:auto"></i><i class="oppose" style="flex:${t.critical}"></i>`;
    hover($('laya-bar'), `Supportive ${pct(t.supportive)} · Neutral ${pct(t.neutral)} · Critical ${pct(t.critical)}`);
    const cls = { supportive: 'support', critical: 'oppose', neutral: 'neutral' };
    $('laya-items').innerHTML = laya.items.map((it) => {
      const link = /^https?:\/\//i.test(it.url) ? `<a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${esc(it.title || it.url)}</a><br>` : '';
      return `<li><span class="tone"><i class="dot ${cls[it.tone] || 'neutral'}"></i>${esc(it.tone)} ${pct(it.probabilities?.[it.tone] || 0)}</span>` +
        `<span>${link}${esc(it.report)}</span></li>`;
    }).join('');
  }

  function renderTimeline(res) {
    const W = 560, H = 250, L = 38, R = 78, T = 10, B = 26;
    const days = res.aware.mean.length - 1;
    const top = Math.max(0.01, Math.max(...res.aware.max)) * 1.12;
    const X = (d) => L + (d / days) * (W - L - R);
    const Y = (v) => T + (1 - v / top) * (H - T - B);
    const series = [
      { key: 'aware', name: 'Aware', color: '#c98500' },
      { key: 'support', name: 'Supports', color: '#3987e5' },
      { key: 'oppose', name: 'Opposes', color: '#e66767' },
    ];
    const line = (arr) => arr.map((v, d) => `${d ? 'L' : 'M'}${X(d).toFixed(1)},${Y(v).toFixed(1)}`).join('');

    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Share of the simulated population that is aware, supportive and opposed, by day">`;
    for (let g = 0; g <= 4; g++) {
      const v = (top / 4) * g;
      svg += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,0.07)"/>` +
        `<text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${pct(v, top < 0.1 ? 1 : 0)}</text>`;
    }
    for (let d = 0; d <= days; d += Math.ceil(days / 7)) svg += `<text x="${X(d)}" y="${H - 6}" text-anchor="middle">${d}</text>`;
    svg += `<text x="${W - R}" y="${H - 6}" text-anchor="end" dx="${R - 4}">day</text>`;

    // End labels, nudged apart when two lines finish close together.
    const ends = series.map((s) => ({ s, y: Y(res[s.key].mean[days]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;

    series.forEach((s) => {
      const band = res[s.key];
      const area = band.max.map((v, d) => `${d ? 'L' : 'M'}${X(d).toFixed(1)},${Y(v).toFixed(1)}`).join('') +
        band.min.map((v, d) => [d, v]).reverse().map(([d, v]) => `L${X(d).toFixed(1)},${Y(v).toFixed(1)}`).join('') + 'Z';
      svg += `<path class="band" d="${area}" fill="${s.color}" opacity="0.18"/>` +
        `<path class="draw" pathLength="1" d="${line(band.mean)}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`;
    });
    ends.forEach(({ s, y }) => {
      svg += `<circle class="endpoint" cx="${X(days)}" cy="${Y(res[s.key].mean[days])}" r="4" fill="${s.color}" stroke="#0b0e14" stroke-width="2"/>` +
        `<text class="end endpoint" x="${X(days) + 9}" y="${y + 4}">${s.name} ${pct(res[s.key].mean[days], 1)}</text>`;
    });
    svg += `<line id="cross" y1="${T}" y2="${H - B}" stroke="rgba(255,255,255,0.35)" visibility="hidden"/>` +
      `<rect id="hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/></svg>`;
    $('timeline').innerHTML = svg;

    const hit = $('hit'), cross = $('cross');
    hit.addEventListener('pointermove', (e) => {
      const box = hit.getBoundingClientRect();
      const d = Math.max(0, Math.min(days, Math.round(((e.clientX - box.left) / box.width) * days)));
      cross.setAttribute('x1', X(d)); cross.setAttribute('x2', X(d)); cross.setAttribute('visibility', 'visible');
      showTip(`<b>Day ${d}</b>` + series.map((s) =>
        `<div class="row"><i class="dot" style="background:${s.color}"></i>${s.name} ${pct(res[s.key].mean[d], 1)} · ${num(res[s.key].mean[d] * POPULATION)} people</div>`).join(''),
      e.clientX, e.clientY);
    });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); hideTip(); });

    $('timeline-table').innerHTML = '<table><thead><tr><th>Day</th><th>Aware</th><th>Supports</th><th>Opposes</th></tr></thead><tbody>' +
      res.aware.mean.map((_, d) => `<tr><td>${d}</td>${series.map((s) => `<td>${pct(res[s.key].mean[d], 1)}</td>`).join('')}</tr>`).join('') +
      '</tbody></table>';
  }

  function simulate(f, segments) {
    if (sim) sim.terminate();
    sim = new Worker('sim-worker.js');
    let seed = 7;
    for (const ch of String(f.id)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    sim.onmessage = (e) => {
      const m = e.data;
      $('c-inter').textContent = num(m.exposures);
      if (m.type === 'progress') { $('c-runs').textContent = `${m.run} / ${m.runs}`; return; }
      $('c-runs').textContent = String(RUNS);
      renderTimeline(m);
      web.setSnapshots(m.snapshots);
    };
    sim.postMessage({
      segments, days: horizon, population: POPULATION, runs: RUNS, contacts: CONTACTS, homophily: HOMOPHILY,
      sampleStep: Math.floor(POPULATION / web.count), seed,
    });
  }

  function show(f) {
    const segments = cleanSegments(f.segments || []);
    horizon = Math.max(7, Math.min(30, Math.round(f.horizon_days) || 14));
    const demo = !!(f.meta && f.meta.demo);

    $('stage').classList.add('live');
    $('hud').hidden = false;
    $('q').value = f.question;
    $('hud-day').textContent = `Day 0 of ${horizon}`;
    $('results').hidden = false;
    $('demo-banner').hidden = !demo;
    $('demo-banner').textContent = demo
      ? 'Sample forecast. The live backend is not connected, so the probabilities and audience rates below are hand-written examples. The population simulation is real and ran in your browser.'
      : '';
    $('summary').textContent = f.summary || '';
    if (demo) { $('c-sources').textContent = '0 (sample)'; $('c-samples').textContent = '0 (sample)'; }
    else { tween($('c-sources'), (f.sources || []).length); tween($('c-samples'), f.meta?.samples || 0); }
    $('c-inter').textContent = '0';

    renderOutcomes(f.outcomes || []);
    renderSegments(segments);
    renderLists(f);
    renderLaya(f, demo);
    $('timeline').innerHTML = '<p class="fine">Running the simulation…</p>';
    // A background tab does not report intersections, so show everything there.
    document.querySelectorAll('.results .panel').forEach((el) => {
      if (document.hidden || reduced) { el.classList.add('in'); return; }
      el.classList.remove('in');
      reveal.observe(el);
    });
    web.layoutSegments(segments);
    web.snapshots = null;
    simulate(f, segments);
  }

  async function ask(question) {
    if (!API) {
      setNote(question === DEMO.question ? '' : 'The live backend is not connected yet, so this shows the sample forecast instead of your question.');
      show(DEMO);
      return;
    }
    $('go').disabled = true;
    setNote('');
    const started = Date.now();
    const tick = () => {
      const s = Math.floor((Date.now() - started) / 1000);
      $('progress-text').textContent = `Searching live news and polling forecasters · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} · usually about two minutes`;
    };
    tick();
    const timer = setInterval(tick, 1000);
    $('progress').hidden = false;
    $('stage').classList.add('busy');
    web.setBusy(true);
    try {
      const res = await fetch(API + '/api/forecast', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      setNote('');
      history.replaceState(null, '', '?f=' + encodeURIComponent(body.id));
      show(body);
    } catch (err) {
      setNote(err.message || 'Something went wrong. Try again.', true);
    } finally {
      clearInterval(timer);
      $('progress').hidden = true;
      $('stage').classList.remove('busy');
      web.setBusy(false);
      $('go').disabled = false;
    }
  }

  $('ask').addEventListener('submit', (e) => {
    e.preventDefault();
    const question = $('q').value.trim();
    if (question) ask(question);
  });

  chips();
  tween($('c-people'), POPULATION, num, 1600);
  if (!API) setNote('Sample mode: the live backend is not connected.');
  else setNote('Questions and forecasts are saved and can be opened by anyone with the link.');

  const shared = new URLSearchParams(location.search).get('f');
  if (API && shared) {
    fetch(API + '/api/forecast/' + encodeURIComponent(shared))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((f) => { $('q').value = f.question; show(f); })
      .catch(() => setNote('That forecast could not be found.', true));
  }
})();
