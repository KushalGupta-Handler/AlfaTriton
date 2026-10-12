// V5: the page is the workpiece. The torch is big in the hero, gets pulled to the
// right edge, and from there welds a seam down the page as you scroll. The bead
// lives in document space (it scrolls away with the text and cools behind you).
const ws = document.querySelector<HTMLElement>('[data-ws]');
const seam = document.querySelector<HTMLElement>('[data-wseam]');

if (ws && seam) {
  const $ = <T extends Element = SVGElement>(s: string) => ws.querySelector<T>(s)!;
  const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rig = $<HTMLElement>('[data-ws-rig]');
  const arc = $('[data-ws-arc]');
  const core = $('[data-ws-core]');
  const heatGlow = $('[data-ws-heat]');
  const room = $('[data-ws-room]');
  const rodLine = $('[data-ws-rod-line]');
  const sparkSvg = $<SVGSVGElement>('[data-ws-sparks]');
  const sparkEls = Array.from(sparkSvg.querySelectorAll<SVGLineElement>('line'));

  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-gear]'));
  type Pose = { x: number; y: number; s: number; o: number; hero: number };
  type Key = { at: number; kind: 'hero' | 'dock' | 'lift' };
  let keys: Key[] = [];
  let seamStart = 0;
  let laidEnd = 0;

  const mobile = () => window.innerWidth < 1024;
  const seamRight = () => (mobile() ? 18 : 46);
  const pose = (kind: Key['kind']): Pose => {
    const vw = window.innerWidth, vh = window.innerHeight, m = mobile();
    const dockX = vw - seamRight();
    if (kind === 'hero') return m ? { x: vw * 0.78, y: vh * 0.3, s: 0.72, o: 0.6, hero: 1 } : { x: vw * 0.75, y: vh * 0.5, s: 1.25, o: 1, hero: 1 };
    const dock = { x: dockX, y: vh * (m ? 0.66 : 0.62), s: m ? 0.3 : 0.42, o: 1, hero: 0 };
    return kind === 'dock' ? dock : { ...dock, x: dockX + 40, y: vh * 0.2, o: 0 };
  };

  const measure = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    keys = sections.map((sec, i) => {
      const top = sec.getBoundingClientRect().top + window.scrollY;
      const kind: Key['kind'] = i === 0 ? 'hero' : sec.hasAttribute('data-final') ? 'lift' : 'dock';
      const at = i === 0 ? 0 : kind === 'lift' ? maxScroll : Math.min(top - window.innerHeight * 0.35, maxScroll - 1);
      return { at: Math.max(0, at), kind };
    });
    const hero = sections[0];
    seamStart = hero ? hero.getBoundingClientRect().bottom + window.scrollY - window.innerHeight * 0.1 : 0;
    seam.style.setProperty('--doc-h', `${document.documentElement.scrollHeight}px`);
    seam.style.setProperty('--start', `${seamStart.toFixed(0)}px`);
    sparkSvg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
  };

  const target = (): Pose => {
    const y = window.scrollY;
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (y < b.at) {
        const t = smooth(clamp((y - a.at) / Math.max(1, b.at - a.at)));
        const pa = pose(a.kind), pb = pose(b.kind);
        return { x: pa.x + (pb.x - pa.x) * t, y: pa.y + (pb.y - pa.y) * t, s: pa.s + (pb.s - pa.s) * t, o: pa.o + (pb.o - pa.o) * t, hero: pa.hero + (pb.hero - pa.hero) * t };
      }
    }
    return pose(keys.length ? keys[keys.length - 1].kind : 'dock');
  };

  measure();
  const cur: Pose = { ...target() };
  let arcV = 0, act = 0, heat = 0, phase = 0;
  let lastScroll = window.scrollY, last = performance.now();
  let running = false;
  type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number };
  const sparks: (Spark | null)[] = sparkEls.map(() => null);

  const tick = (now: number) => {
    const dt = Math.min(50, now - last) || 16;
    last = now;
    const k = 1 - Math.pow(0.002, dt / 1000);
    const sy = window.scrollY;
    const dy = sy - lastScroll;
    lastScroll = sy;
    const speed = Math.abs(dy) / dt;
    act += (clamp(speed * 1.1) - act) * (speed > 0.02 ? 0.35 : 0.05);

    const t = target();
    cur.x += (t.x - cur.x) * k; cur.y += (t.y - cur.y) * k; cur.s += (t.s - cur.s) * k;
    cur.o += (t.o - cur.o) * k; cur.hero += (t.hero - cur.hero) * k;
    rig.style.setProperty('--x', `${cur.x.toFixed(1)}px`);
    rig.style.setProperty('--y', `${cur.y.toFixed(1)}px`);
    rig.style.setProperty('--s', cur.s.toFixed(4));
    rig.style.setProperty('--o', cur.o.toFixed(3));
    rig.style.setProperty('--hero', cur.hero.toFixed(3));

    // Weld the page: once docked, moving down lays bead up to the torch tip.
    const docked = Math.abs(cur.x - (window.innerWidth - seamRight())) < 4 && cur.hero < 0.05 && cur.o > 0.5;
    const tipDoc = sy + cur.y;
    let advanced = 0;
    if (docked && dy > 0 && tipDoc > seamStart && tipDoc > laidEnd) {
      advanced = tipDoc - Math.max(laidEnd, seamStart);
      laidEnd = tipDoc;
    }
    const laid = Math.max(0, laidEnd - seamStart);
    seam.style.setProperty('--laid', `${laid.toFixed(0)}px`);
    heat = advanced > 0.5 ? Math.min(1, heat + 0.3) : heat * Math.exp(-dt / 1400);
    seam.style.setProperty('--heat', heat.toFixed(3));

    // Arc: alive in the hero, and on the seam only while it's advancing.
    const inHero = cur.hero > 0.5;
    const arcTarget = inHero ? 0.35 + 0.65 * act : docked && advanced > 0 ? 0.3 + 0.7 * act : docked ? heat * 0.25 : 0;
    arcV += (arcTarget - arcV) * (arcTarget > arcV ? 0.5 : 0.12);
    const flick = arcV * (0.82 + Math.random() * 0.18);
    arc.setAttribute('opacity', flick.toFixed(3));
    arc.setAttribute('r', (36 + flick * 16 + Math.random() * 5).toFixed(1));
    core.setAttribute('opacity', Math.min(1, arcV * 1.4).toFixed(3));
    heatGlow.setAttribute('opacity', (arcV * 0.9).toFixed(3));
    room.setAttribute('opacity', (flick * 0.8).toFixed(3));

    // Filler rod dabs in rhythm with travel.
    phase += (advanced > 0 ? advanced / 14 : inHero ? act * dt * 0.012 : 0) * Math.PI * 2 / 2;
    const dip = Math.max(0, Math.sin(phase)) * 8 * Math.min(1, arcV * 1.5);
    rodLine.setAttribute('x2', (-9 - dip * 0.4).toFixed(1));
    rodLine.setAttribute('y2', (-5 + dip).toFixed(1));

    // Sparks from the tip (viewport space), short-lived so they stay near the edge.
    if (!reduce) {
      const n = arcV > 0.5 ? act * 1.8 * Math.random() : 0;
      for (let i = 0; i < n; i++) {
        const idx = sparks.findIndex((s) => !s);
        if (idx < 0) break;
        const max = 260 + Math.random() * 380;
        const sc = Math.max(0.5, cur.s * 1.6);
        sparks[idx] = { x: cur.x, y: cur.y, vx: (-2.6 + Math.random() * 3.6) * sc, vy: (-3.2 + Math.random() * 2.4) * sc, life: max, max };
      }
      sparks.forEach((s, i) => {
        const el = sparkEls[i];
        if (!s) { el.setAttribute('opacity', '0'); return; }
        const f = dt / 16;
        s.vy += 0.2 * f; s.x += s.vx * f; s.y += s.vy * f; s.life -= dt;
        if (s.life <= 0) { sparks[i] = null; el.setAttribute('opacity', '0'); return; }
        el.setAttribute('x1', s.x.toFixed(1)); el.setAttribute('y1', s.y.toFixed(1));
        el.setAttribute('x2', (s.x - s.vx * 2).toFixed(1)); el.setAttribute('y2', (s.y - s.vy * 2).toFixed(1));
        el.setAttribute('opacity', (s.life / s.max).toFixed(2));
      });
    }

    const settled = Math.abs(t.x - cur.x) < 0.3 && Math.abs(t.y - cur.y) < 0.3 && Math.abs(t.o - cur.o) < 0.003 && Math.abs(t.s - cur.s) < 0.001;
    const idle = settled && act < 0.01 && heat < 0.01 && !sparks.some(Boolean) && Math.abs(arcTarget - arcV) < 0.01;
    // Sleep when nothing moves; the arc keeps its steady idle glow.
    if (idle) { running = false; arc.setAttribute('opacity', arcV.toFixed(3)); return; }
    requestAnimationFrame(tick);
  };
  const wake = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); } };

  if (reduce) {
    const p = pose('dock');
    Object.assign(cur, target());
    rig.style.setProperty('--x', `${cur.x}px`); rig.style.setProperty('--y', `${cur.y}px`);
    rig.style.setProperty('--s', String(cur.s)); rig.style.setProperty('--o', String(cur.o)); rig.style.setProperty('--hero', String(cur.hero));
    const fill = () => { laidEnd = Math.max(laidEnd, window.scrollY + p.y); seam.style.setProperty('--laid', `${Math.max(0, laidEnd - seamStart)}px`); };
    fill();
    window.addEventListener('scroll', () => { Object.assign(cur, target()); rig.style.setProperty('--x', `${cur.x}px`); rig.style.setProperty('--y', `${cur.y}px`); rig.style.setProperty('--s', String(cur.s)); rig.style.setProperty('--o', String(cur.o)); rig.style.setProperty('--hero', String(cur.hero)); fill(); }, { passive: true });
  } else {
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', () => { measure(); wake(); });
    new ResizeObserver(() => { measure(); wake(); }).observe(document.body);
    // If the page loads part-way down (refresh / anchor link), the weld above is already done.
    window.addEventListener('load', () => {
      measure();
      const tip = window.scrollY + pose('dock').y;
      if (window.scrollY > 0 && tip > seamStart) { laidEnd = tip; seam.style.setProperty('--laid', `${laidEnd - seamStart}px`); }
      wake();
    });
    wake();
  }
}
