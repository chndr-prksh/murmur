// The dense web behind the page. Each dot stands for a fixed slice of the
// simulated population; once a simulation has run, a dot's colour is the real
// state of one sampled person from the first run on the day being shown.
(function () {
  const COLORS = ['#5b6a88', '#aab3c2', '#3987e5', '#e66767'];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function gauss() {
    return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
  }

  class Web {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.count = window.innerWidth < 760 ? 1800 : 4200;
      this.x = new Float32Array(this.count);
      this.y = new Float32Array(this.count);
      this.tx = new Float32Array(this.count);
      this.ty = new Float32Array(this.count);
      this.phase = new Float32Array(this.count);
      for (let i = 0; i < this.count; i++) this.phase[i] = Math.random() * 6.283;
      this.links = new Int32Array(0);
      this.labels = [];
      this.snapshots = null;
      this.day = 0;
      this.onDay = null;
      this.resize();
      this.layoutIdle();
      this.x.set(this.tx); this.y.set(this.ty);
      window.addEventListener('resize', () => { this.resize(); this.relayout(); });
      requestAnimationFrame((t) => this.frame(t));
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = window.innerWidth; this.h = window.innerHeight;
      this.canvas.width = this.w * dpr; this.canvas.height = this.h * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    relayout() {
      if (this.segments) this.layoutSegments(this.segments); else this.layoutIdle();
    }

    layoutIdle() {
      const blobs = [];
      for (let b = 0; b < 18; b++) blobs.push([0.06 + Math.random() * 0.88, 0.08 + Math.random() * 0.84, 0.03 + Math.random() * 0.05]);
      for (let i = 0; i < this.count; i++) {
        // One dot in five is scattered loose so the clusters sit in a continuous mesh.
        if (i % 5 === 0) { this.tx[i] = Math.random() * this.w; this.ty[i] = Math.random() * this.h; continue; }
        const [cx, cy, r] = blobs[i % blobs.length];
        this.tx[i] = (cx + gauss() * r) * this.w;
        this.ty[i] = (cy + gauss() * r * 1.3) * this.h;
      }
      this.labels = [];
      this.buildLinks();
    }

    // Largest audience in the middle, the rest on a ring around it.
    layoutSegments(segments) {
      this.segments = segments;
      const order = segments.map((g, i) => i).sort((a, b) => segments[b].share - segments[a].share);
      // Sits low in the viewport so the question box and legend stay clear of it.
      const cx = this.w / 2, cy = this.h * 0.55;
      const span = Math.min(this.w, this.h * 1.35);
      const centers = [];
      order.forEach((si, rank) => {
        if (rank === 0) { centers[si] = [cx, cy]; return; }
        // Half-step offset keeps any cluster from sitting directly under the question box.
        const a = -Math.PI / 2 + ((rank - 0.5) / (order.length - 1)) * Math.PI * 2;
        centers[si] = [cx + Math.cos(a) * this.w * 0.36, cy + Math.sin(a) * this.h * 0.22];
      });

      let acc = 0, i = 0;
      this.labels = [];
      segments.forEach((g, si) => {
        acc += g.share;
        const end = si === segments.length - 1 ? this.count : Math.round(acc * this.count);
        const r = span * (0.035 + Math.sqrt(g.share) * 0.17);
        for (; i < end; i++) {
          this.tx[i] = centers[si][0] + gauss() * r;
          this.ty[i] = centers[si][1] + gauss() * r * 0.8;
        }
        this.labels.push({ text: g.name, x: centers[si][0], y: centers[si][1] - r * 0.95 - 10 });
      });
      this.buildLinks();
    }

    // Two nearest neighbours per dot, found through a coarse grid, plus a few long links.
    buildLinks() {
      const cell = 44, cols = Math.ceil(this.w / cell) + 2;
      const grid = new Map();
      const key = (i) => (Math.floor(this.ty[i] / cell) + 1) * cols + Math.floor(this.tx[i] / cell) + 1;
      for (let i = 0; i < this.count; i++) {
        const k = key(i);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(i);
      }
      const out = [];
      for (let i = 0; i < this.count; i++) {
        const k = key(i);
        let b1 = -1, b2 = -1, d1 = 1e9, d2 = 1e9;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const bucket = grid.get(k + oy * cols + ox);
          if (!bucket) continue;
          for (const j of bucket) {
            if (j === i) continue;
            const d = (this.tx[i] - this.tx[j]) ** 2 + (this.ty[i] - this.ty[j]) ** 2;
            if (d < d1) { d2 = d1; b2 = b1; d1 = d; b1 = j; } else if (d < d2) { d2 = d; b2 = j; }
          }
        }
        if (b1 > i || b1 >= 0 && b2 === -1) out.push(i, b1);
        if (b2 >= 0) out.push(i, b2);
        if (i % 23 === 0) out.push(i, (i * 7919 + 13) % this.count);
      }
      this.links = Int32Array.from(out);
    }

    setSnapshots(snapshots) {
      this.snapshots = snapshots;
      this.play();
    }

    play() {
      if (!this.snapshots) return;
      this.day = reduced ? this.snapshots.length - 1 : 0;
      this.playStart = performance.now();
    }

    clear() {
      this.snapshots = null; this.segments = null;
      this.layoutIdle();
    }

    stateOf(i, day) {
      return this.snapshots ? this.snapshots[day][i] : 0;
    }

    frame(t) {
      const { ctx, count } = this;
      if (this.snapshots && !reduced) {
        const last = this.snapshots.length - 1;
        this.day = Math.min(last, ((t - this.playStart) / 8000) * last);
      }
      const day = Math.floor(this.day);
      if (this.onDay && day !== this.shownDay) { this.shownDay = day; this.onDay(day); }

      const px = new Float32Array(count), py = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        this.x[i] += (this.tx[i] - this.x[i]) * 0.06;
        this.y[i] += (this.ty[i] - this.y[i]) * 0.06;
        const drift = reduced ? 0 : 2.2;
        px[i] = this.x[i] + Math.sin(t * 0.0004 + this.phase[i]) * drift;
        py[i] = this.y[i] + Math.cos(t * 0.0005 + this.phase[i] * 1.7) * drift;
      }

      ctx.clearRect(0, 0, this.w, this.h);

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(120, 150, 205, 0.2)';
      ctx.beginPath();
      const live = [];
      for (let l = 0; l < this.links.length; l += 2) {
        const a = this.links[l], b = this.links[l + 1];
        if (this.snapshots && this.stateOf(a, day) && this.stateOf(b, day)) { live.push(a, b); continue; }
        ctx.moveTo(px[a], py[a]); ctx.lineTo(px[b], py[b]);
      }
      ctx.stroke();
      if (live.length) {
        ctx.strokeStyle = 'rgba(200, 215, 255, 0.42)';
        ctx.beginPath();
        for (let l = 0; l < live.length; l += 2) { ctx.moveTo(px[live[l]], py[live[l]]); ctx.lineTo(px[live[l + 1]], py[live[l + 1]]); }
        ctx.stroke();
      }

      for (let s = 0; s < 4; s++) {
        ctx.fillStyle = COLORS[s];
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          if (this.stateOf(i, day) !== s) continue;
          const r = s === 0 ? 1.4 : 2;
          ctx.moveTo(px[i] + r, py[i]);
          ctx.arc(px[i], py[i], r, 0, 6.283);
        }
        ctx.fill();
        if (s >= 2) {
          ctx.globalAlpha = 0.16;
          ctx.beginPath();
          for (let i = 0; i < count; i++) {
            if (this.stateOf(i, day) !== s) continue;
            ctx.moveTo(px[i] + 5, py[i]);
            ctx.arc(px[i], py[i], 5, 0, 6.283);
          }
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Idle twinkle so the empty web still reads as alive.
      if (!this.snapshots && !reduced) {
        ctx.fillStyle = 'rgba(160, 190, 255, 0.85)';
        ctx.beginPath();
        const beat = Math.floor(t / 420);
        for (let n = 0; n < 60; n++) {
          const i = (beat * 131 + n * 977) % count;
          ctx.moveTo(px[i] + 2, py[i]);
          ctx.arc(px[i], py[i], 2, 0, 6.283);
        }
        ctx.fill();
      }

      if (this.labels.length) {
        ctx.font = '600 11px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(6, 8, 13, 0.9)';
        ctx.fillStyle = '#a3acbb';
        for (const label of this.labels) {
          // Model-written audience names can be long; keep them short and fully on screen.
          const text = (label.text.length > 26 ? label.text.slice(0, 25).trimEnd() + '…' : label.text).toUpperCase();
          const half = ctx.measureText(text).width / 2 + 8;
          const x = Math.max(half, Math.min(this.w - half, label.x));
          const y = Math.max(190, label.y);
          ctx.strokeText(text, x, y);
          ctx.fillText(text, x, y);
        }
      }

      requestAnimationFrame((n) => this.frame(n));
    }
  }

  window.MurmurWeb = Web;
})();
