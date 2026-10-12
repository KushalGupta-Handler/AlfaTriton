// Scroll-driven TIG weld. Scroll position = how far along the seam we are;
// scroll *speed* = whether the arc is live (stop scrolling and the torch pauses).
const root = document.querySelector<HTMLElement>('[data-weld]');

if (root) {
  const $ = <T extends Element = SVGElement>(s: string) => root.querySelector<T>(s)!;
  const $$ = <T extends Element = SVGElement>(s: string) => Array.from(root.querySelectorAll<T>(s));
  const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const X0 = 170, X1 = 1030, SEAM = 430, STEP = 7;
  const svg = $<SVGSVGElement>('[data-weld-svg]');
  const plateTop = $('[data-plate-top]');
  const plateBot = $('[data-plate-bot]');
  const torch = $('[data-torch]');
  const arc = $('[data-arc]');
  const arcCore = $('[data-arc-core]');
  const heat = $('[data-heat]');
  const room = $('[data-room]');
  const rod = $('[data-rod]');
  const rodLine = $('[data-rod-line]');
  const rodTip = $('[data-rod-tip]');
  const beads = $$('[data-bead] > g');
  const beadFill = beads.map((g) => g.querySelector('ellipse')!);
  const tintOut = $$('[data-tint] > ellipse');
  const tintIn = $$('[data-tint-in] > ellipse');
  const tacks = $$('[data-tacks] > ellipse');
  const sparkEls = $$<SVGLineElement>('[data-sparks] > line');
  const steps = $$<HTMLElement>('[data-step]');
  const arcDot = root.querySelector<HTMLElement>('.weld__arc')!;
  const arcState = root.querySelector<HTMLElement>('[data-arc-state]')!;
  const seamEl = root.querySelector<HTMLElement>('[data-seam]')!;
  const bar = root.querySelector<HTMLElement>('[data-weld-bar]')!;
  const rippleX = beads.map((_, i) => X0 + i * STEP);

  // Bead colour by "age" (how far behind the torch it is): white-hot → orange → dull red → steel.
  const beadStops: [number, number[]][] = [
    [0, [255, 251, 232]], [14, [255, 233, 163]], [34, [255, 179, 71]], [70, [255, 106, 42]],
    [120, [138, 44, 28]], [190, [92, 74, 68]], [270, [160, 168, 176]],
  ];
  const colorAt = (age: number) => {
    for (let i = 1; i < beadStops.length; i++) {
      const [a, ca] = beadStops[i - 1], [b, cb] = beadStops[i];
      if (age <= b) {
        const t = clamp((age - a) / (b - a));
        return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * t)).join(',')})`;
      }
    }
    const c = beadStops[beadStops.length - 1][1];
    return `rgb(${c.join(',')})`;
  };
  // Heat-tint bands (straw close in, blue/purple further out) — permanent on stainless.
  tintIn.forEach((e) => e.setAttribute('fill', '#c9a24e'));
  tintOut.forEach((e, i) => e.setAttribute('fill', i % 3 === 0 ? '#7c5aa8' : '#4a64b0'));

  type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number };
  const sparks: (Spark | null)[] = sparkEls.map(() => null);

  const cur = { tx: X0 - 60, ty: -160, to: 0, arc: 0, act: 0, vbx: 60 };
  let lastScroll = window.scrollY;
  let last = performance.now();
  let running = false;
  let visible = false;

  const progress = () => {
    const r = root.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - window.innerHeight));
  };

  const frame = (now: number, still = false) => {
    const dt = Math.min(50, now - last) || 16;
    last = now;
    const p = still ? 1 : progress();
    const k = still ? 1 : 1 - Math.pow(0.002, dt / 1000);

    // Scroll speed → activity (arc live while you scroll)
    const sy = window.scrollY;
    const speed = Math.abs(sy - lastScroll) / dt;
    lastScroll = sy;
    cur.act += (clamp(speed * 1.2) - cur.act) * (speed > 0.02 ? 0.35 : 0.045);
    if (still) cur.act = 0;

    // 01 Fit-up: plates close, tacks appear
    const gap = 36 * (1 - smooth(clamp(p / 0.1)));
    plateTop.setAttribute('transform', `translate(0 ${-gap})`);
    plateBot.setAttribute('transform', `translate(0 ${gap})`);
    tacks.forEach((t, i) => t.setAttribute('opacity', clamp((p - (0.09 + i * 0.018)) / 0.015).toFixed(2)));

    // Torch path
    let tx: number, ty: number, to: number;
    if (p < 0.14) { tx = X0 - 40; ty = -160 + 120 * smooth(clamp((p - 0.08) / 0.06)); to = clamp((p - 0.08) / 0.05); }
    else if (p < 0.2) { tx = X0; ty = -40 * (1 - smooth(clamp((p - 0.14) / 0.04))); to = 1; }
    else if (p < 0.9) { tx = X0 + (X1 - X0) * ((p - 0.2) / 0.7); ty = 0; to = 1; }
    else { const e = smooth(clamp((p - 0.9) / 0.1)); tx = X1 + 60 * e; ty = -190 * e; to = 1 - e; }
    cur.tx += (tx - cur.tx) * k;
    cur.ty += (ty - cur.ty) * k;
    cur.to += (to - cur.to) * k;
    torch.setAttribute('transform', `translate(${cur.tx.toFixed(1)} ${(SEAM + cur.ty).toFixed(1)})`);
    torch.setAttribute('opacity', cur.to.toFixed(3));

    // Arc: idles low while paused on the seam, flares while you scroll
    const onSeam = p >= 0.18 && p < 0.9 && cur.ty > -6;
    const strike = p >= 0.18 && p < 0.205 ? 1 : 0;
    const arcTarget = onSeam ? Math.max(strike, 0.28 + 0.72 * cur.act) : 0;
    cur.arc += (arcTarget - cur.arc) * (arcTarget > cur.arc ? 0.5 : 0.1);
    const flick = cur.arc * (0.82 + Math.random() * 0.18);
    arc.setAttribute('opacity', flick.toFixed(3));
    arc.setAttribute('r', (38 + flick * 18 + Math.random() * 6).toFixed(1));
    arcCore.setAttribute('opacity', Math.min(1, cur.arc * 1.4).toFixed(3));
    heat.setAttribute('cx', (cur.tx - 14).toFixed(1));
    heat.setAttribute('opacity', (cur.arc * 0.95).toFixed(3));
    room.setAttribute('cx', cur.tx.toFixed(1));
    room.setAttribute('opacity', (flick * 0.9).toFixed(3));
    arcDot.classList.toggle('on', cur.arc > 0.45);
    arcState.textContent = cur.arc > 0.45 ? 'ON' : 'OFF';

    // Filler rod dabs in rhythm with travel (one dab per two ripples)
    const welding = p >= 0.2 && p < 0.9;
    const phase = ((cur.tx - X0) / (STEP * 2)) * Math.PI * 2;
    const dip = welding ? Math.max(0, Math.sin(phase)) * 8 * Math.min(1, cur.arc * 1.5) : 0;
    rod.setAttribute('transform', `translate(${cur.tx.toFixed(1)} ${SEAM})`);
    rod.setAttribute('opacity', (welding ? Math.min(1, cur.to) : 0).toString());
    rodLine.setAttribute('x2', (-16 + dip * 0.7).toFixed(1));
    rodLine.setAttribute('y2', (-6 + dip).toFixed(1));
    rodTip.setAttribute('cx', (-16 + dip * 0.7).toFixed(1));
    rodTip.setAttribute('cy', (-6 + dip).toFixed(1));
    rodTip.setAttribute('opacity', (dip / 8).toFixed(2));

    // Bead + heat tint: everything behind the torch, coloured by how long ago it was laid
    const laidTo = p >= 0.2 ? cur.tx : -1;
    const coolExtra = p > 0.9 ? ((p - 0.9) / 0.1) * 300 : 0;
    for (let i = 0; i < beads.length; i++) {
      const x = rippleX[i];
      const on = x <= laidTo;
      beads[i].setAttribute('opacity', on ? '1' : '0');
      if (!on) { tintIn[i].setAttribute('opacity', '0'); tintOut[i].setAttribute('opacity', '0'); continue; }
      const age = laidTo - x + coolExtra;
      beadFill[i].setAttribute('fill', colorAt(age));
      tintIn[i].setAttribute('opacity', (clamp((age - 20) / 110) * 0.42).toFixed(3));
      tintOut[i].setAttribute('opacity', (clamp((age - 40) / 160) * 0.26).toFixed(3));
    }

    // Sparks: spawned by a live arc, simple gravity
    if (!still && !reduce) {
      const spawn = cur.arc > 0.5 ? cur.act * 2.2 * Math.random() : 0;
      for (let n = 0; n < spawn; n++) {
        const idx = sparks.findIndex((s) => !s);
        if (idx < 0) break;
        const max = 380 + Math.random() * 420;
        sparks[idx] = { x: cur.tx + 4, y: SEAM - 4, vx: -2.5 + Math.random() * 6.5, vy: -2 - Math.random() * 5.5, life: max, max };
      }
      sparks.forEach((s, i) => {
        const el = sparkEls[i];
        if (!s) { el.setAttribute('opacity', '0'); return; }
        const f = dt / 16;
        s.vy += 0.22 * f;
        s.x += s.vx * f;
        s.y += s.vy * f;
        if (s.y > SEAM + 4 && s.vy > 0) { s.vy *= -0.35; s.vx *= 0.6; s.y = SEAM + 4; }
        s.life -= dt;
        if (s.life <= 0) { sparks[i] = null; el.setAttribute('opacity', '0'); return; }
        el.setAttribute('x1', s.x.toFixed(1));
        el.setAttribute('y1', s.y.toFixed(1));
        el.setAttribute('x2', (s.x - s.vx * 2.2).toFixed(1));
        el.setAttribute('y2', (s.y - s.vy * 2.2).toFixed(1));
        el.setAttribute('opacity', (s.life / s.max).toFixed(2));
      });
    }

    // HUD, steps, progress
    seamEl.textContent = String(Math.round(clamp((cur.tx - X0) / (X1 - X0)) * 430 * (p >= 0.2 ? 1 : 0))).padStart(3, '0');
    const stage = p < 0.14 ? 0 : p < 0.2 ? 1 : p < 0.9 ? 2 : 3;
    steps.forEach((s, i) => s.classList.toggle('on', i === stage));
    bar.style.transform = `scaleX(${p.toFixed(4)})`;

    // A camera that follows the torch along the seam (tighter framing on phones)
    const mobile = window.innerWidth < 1024;
    const vw = mobile ? 640 : 860;
    const vh = mobile ? 400 : 470;
    const want = clamp(cur.tx - vw * 0.45, 60, 1140 - vw);
    cur.vbx += (want - cur.vbx) * (still ? 1 : 0.12);
    svg.setAttribute('viewBox', `${cur.vbx.toFixed(1)} ${mobile ? 200 : 170} ${vw} ${vh}`);
  };

  const loop = (now: number) => {
    frame(now);
    const sparksLive = sparks.some(Boolean);
    if (visible || sparksLive || cur.arc > 0.01) requestAnimationFrame(loop);
    else running = false;
  };
  const wake = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } };

  if (reduce) {
    frame(performance.now(), true);
  } else {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(root);
    window.addEventListener('scroll', () => { if (visible) wake(); }, { passive: true });
    frame(performance.now());
  }
}
