// Population spread model. Runs off the main thread.
//
// Every agent is one simulated person: a segment and a state
// (0 unaware, 1 aware-neutral, 2 support, 3 oppose). Each day a person can hear
// about the event from media (baseline reach) or from someone who amplified it
// the day before (contacts, mostly inside their own segment). The per-segment
// rates come from the forecast; nothing here calls a model.

const UNAWARE = 0, NEUTRAL = 1, SUPPORT = 2, OPPOSE = 3;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function runOnce(cfg, seed, sampleStep) {
  const { segments, days, population: N, contacts, homophily } = cfg;
  const S = segments.length;
  const rand = rng(seed);

  const start = new Int32Array(S + 1);
  let acc = 0;
  for (let s = 0; s < S; s++) {
    start[s] = Math.round(acc * N);
    acc += segments[s].share;
  }
  start[S] = N;

  const segOf = (i) => {
    let s = 0;
    while (s < S - 1 && i >= start[s + 1]) s++;
    return s;
  };

  const state = new Uint8Array(N);
  const dailyReach = segments.map((g) => 1 - Math.pow(1 - g.reach, 1 / days));
  // Chance that someone exposed by a contact actually takes it in.
  const attention = segments.map((g) => Math.min(0.9, 0.2 + g.reach));

  const aware = new Int32Array(S), support = new Int32Array(S), oppose = new Int32Array(S);
  let sharers = [], next = [], exposures = 0;

  const activate = (i, s) => {
    const g = segments[s];
    const u = rand();
    state[i] = u < g.support ? SUPPORT : u < g.support + g.oppose ? OPPOSE : NEUTRAL;
    aware[s]++;
    if (state[i] === SUPPORT) support[s]++;
    else if (state[i] === OPPOSE) oppose[s]++;
    if (rand() < g.amplify) next.push(i);
  };

  const series = { aware: [0], support: [0], oppose: [0] };
  const sampleCount = sampleStep ? Math.floor(N / sampleStep) : 0;
  const snapshots = sampleStep ? [new Uint8Array(sampleCount)] : null;

  for (let d = 1; d <= days; d++) {
    next = [];
    for (let n = 0; n < sharers.length; n++) {
      const s = segOf(sharers[n]);
      for (let c = 0; c < contacts; c++) {
        const t = rand() < homophily
          ? start[s] + Math.floor(rand() * (start[s + 1] - start[s]))
          : Math.floor(rand() * N);
        exposures++;
        if (state[t] !== UNAWARE) continue;
        const ts = segOf(t);
        if (rand() < attention[ts]) activate(t, ts);
      }
    }
    for (let s = 0; s < S; s++) {
      const len = start[s + 1] - start[s];
      const draws = Math.round(len * dailyReach[s]);
      for (let k = 0; k < draws; k++) {
        const t = start[s] + Math.floor(rand() * len);
        exposures++;
        if (state[t] === UNAWARE) activate(t, s);
      }
    }
    sharers = next;

    let a = 0, p = 0, o = 0;
    for (let s = 0; s < S; s++) { a += aware[s]; p += support[s]; o += oppose[s]; }
    series.aware.push(a); series.support.push(p); series.oppose.push(o);

    if (snapshots) {
      const snap = new Uint8Array(sampleCount);
      for (let j = 0; j < sampleCount; j++) snap[j] = state[j * sampleStep];
      snapshots.push(snap);
    }
  }

  return {
    series, snapshots, exposures,
    bySegment: segments.map((g, s) => ({
      size: start[s + 1] - start[s], aware: aware[s], support: support[s], oppose: oppose[s],
    })),
  };
}

self.onmessage = (e) => {
  const cfg = e.data;
  const t0 = performance.now();
  const runs = [];
  let exposures = 0, snapshots = null;

  for (let r = 0; r < cfg.runs; r++) {
    const out = runOnce(cfg, cfg.seed + r * 7919, r === 0 ? cfg.sampleStep : 0);
    if (r === 0) snapshots = out.snapshots;
    exposures += out.exposures;
    runs.push(out);
    self.postMessage({ type: 'progress', run: r + 1, runs: cfg.runs, exposures });
  }

  const band = (key) => {
    const days = runs[0].series[key].length;
    const mean = [], min = [], max = [];
    for (let d = 0; d < days; d++) {
      let sum = 0, lo = Infinity, hi = -Infinity;
      for (const run of runs) {
        const v = run.series[key][d] / cfg.population;
        sum += v; if (v < lo) lo = v; if (v > hi) hi = v;
      }
      mean.push(sum / runs.length); min.push(lo); max.push(hi);
    }
    return { mean, min, max };
  };

  const bySegment = cfg.segments.map((g, s) => {
    const avg = (k) => runs.reduce((t, run) => t + run.bySegment[s][k], 0) / runs.length;
    return { name: g.name, size: runs[0].bySegment[s].size, aware: avg('aware'), support: avg('support'), oppose: avg('oppose') };
  });

  self.postMessage({
    type: 'done',
    aware: band('aware'), support: band('support'), oppose: band('oppose'),
    bySegment, snapshots, exposures,
    ms: Math.round(performance.now() - t0),
  });
};
