// V3 interactions. Everything degrades gracefully without JS.
import { site } from '../data/site';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce) document.documentElement.classList.add('reduced');
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/* ---------------- Time-aware call buttons ----------------
   In business hours "Call" dials the workshop; after hours it dials the
   24/7 breakdown line, so nobody rings an empty office or wakes the on-call
   crew for a routine quote. */
function workshopOpen(): boolean {
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
  const { days, open, close } = site.businessHours;
  return days.includes(day) && h >= open && h < close;
}
const isOpen = workshopOpen();
$$<HTMLAnchorElement>('[data-call]').forEach((a) => {
  const label = $('[data-call-label]', a);
  const short = a.hasAttribute('data-short');
  if (isOpen) {
    a.href = `tel:${site.phone.tel}`;
    if (label) label.textContent = short ? (window.innerWidth >= 640 && a.classList.contains('hd__tel') ? `Call ${site.phone.display}` : 'Call') : `Call ${site.phone.display}`;
  } else {
    a.href = `tel:${site.afterHours.tel}`;
    a.classList.add('is-after');
    if (label) label.textContent = short ? (a.classList.contains('hd__tel') && window.innerWidth >= 640 ? `24/7 ${site.afterHours.display}` : 'Call 24/7') : `Call 24/7 · ${site.afterHours.display}`;
  }
});
// The extra "Line down?" link only matters while the main button dials the workshop.
$$('[data-open-only]').forEach((el) => { el.hidden = !isOpen; });

/* ---------------- Header + mobile bar ---------------- */
const hd = $('[data-hd]');
const bar = $('[data-bar]');
const quote = $('#quote');
const heroCta = $('[data-hero-cta]');
let quoteVisible = false;
let ctaGone = !heroCta;
let lastY = window.scrollY;

function chrome() {
  const y = window.scrollY;
  const dy = y - lastY;
  const focusInHeader = !!document.activeElement?.closest('[data-hd]');
  hd?.classList.toggle('is-solid', y > 40);
  hd?.classList.toggle('has-cta', ctaGone);
  if (ctaGone && dy > 4 && !focusInHeader) hd?.classList.add('is-hidden');
  else if (dy < -4 || !ctaGone) hd?.classList.remove('is-hidden');
  const headerShowingCta = ctaGone && !hd?.classList.contains('is-hidden');
  bar?.classList.toggle('is-on', ctaGone && !quoteVisible && !headerShowingCta);
  if (Math.abs(dy) > 4) lastY = y;
}
if (quote) new IntersectionObserver(([e]) => { quoteVisible = e.isIntersecting; chrome(); }, { threshold: 0.1 }).observe(quote);
if (heroCta) new IntersectionObserver(([e]) => { ctaGone = !e.isIntersecting && e.boundingClientRect.top < 0; chrome(); }, { threshold: 0 }).observe(heroCta);
window.addEventListener('scroll', chrome, { passive: true });
chrome();

/* ---------------- Reveal + count-up ---------------- */
const io = new IntersectionObserver((es) => {
  for (const e of es) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
$$('.rv, .split, .pr__step').forEach((el) => io.observe(el));

/* ---------------- Full-page gear train ---------------- */
const stage = $('[data-gs]');
const train = $('[data-gs-train]');
const bigG = $('[data-gs-big]');
const pinG = $('[data-gs-pin]');
const bigMask = $('[data-gs-big-mask]');
const pinMask = $('[data-gs-pin-mask]');
const rack = $('[data-gs-rack]');
const vrack = $('[data-gs-vrack]');
const heroVideo = $<HTMLVideoElement>('[data-hero-video]');

if (stage && train && bigG && pinG && rack) {
  const R = Number(stage.dataset.r);
  const r = Number(stage.dataset.pr);
  const pitch = Number(stage.dataset.pitch);
  const bigPhase = Number(stage.dataset.bigPhase);
  const pinPhase = Number(stage.dataset.pinPhase);
  const sections = $$('[data-gear]');
  // 2:1 reduction between page and edge rack: calmer spin, still clearly scroll-driven.
  const DRIVE_RATIO = 0.5;
  // x = 'D' means "docked": gear parked against the right screen edge, meshing with the edge rack.
  type K = { at: number; x: number | 'D'; y: number; s: number; o: number; rack: number; tone: string };
  type V = { x: number; y: number; s: number; o: number; rack: number };
  let keys: K[] = [];

  const ppuAt = (s: number) => (train.offsetWidth / 1120) * s; // px per SVG unit at scale s
  const dockX = (s: number) => {
    const vw = window.innerWidth;
    const rpx = R * ppuAt(s);
    // Desktop: pitch circle touches the edge rack. Mobile: mostly off-screen, a sliver peeks in.
    const cx = vw >= 1024 ? vw - 9 - rpx : vw + rpx * 0.72;
    return (cx / vw) * 100;
  };

  const measure = () => {
    const mobile = window.innerWidth < 1024;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    keys = sections.map((sec) => {
      const [x, y, s, o] = ((mobile && sec.dataset.gearM) || sec.dataset.gear || '50,50,1,1').split(',');
      const top = sec.getBoundingClientRect().top + window.scrollY;
      const at = sec.hasAttribute('data-final') ? maxScroll : Math.min(top - window.innerHeight * 0.35, maxScroll - 1);
      return { at: Math.max(0, at), x: x === 'D' ? 'D' : Number(x), y: Number(y), s: Number(s), o: Number(o), rack: sec.dataset.rack ? 1 : 0, tone: sec.dataset.tone || 'dark' };
    });
    if (keys.length) keys[0].at = 0;
  };
  const resolve = (k: K): V => ({ x: k.x === 'D' ? dockX(k.s) : k.x, y: k.y, s: k.s, o: k.o, rack: k.rack });

  const target = (): { v: V; tone: string } => {
    const y = window.scrollY;
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (y < b.at) {
        const t = smooth(clamp((y - a.at) / Math.max(1, b.at - a.at)));
        const va = resolve(a), vb = resolve(b);
        return {
          v: { x: va.x + (vb.x - va.x) * t, y: va.y + (vb.y - va.y) * t, s: va.s + (vb.s - va.s) * t, o: va.o + (vb.o - va.o) * t, rack: va.rack + (vb.rack - va.rack) * t },
          tone: t < 0.5 ? a.tone : b.tone,
        };
      }
    }
    const last = keys[keys.length - 1];
    return { v: resolve(last), tone: last.tone };
  };

  measure();
  const cur: V = { ...target().v };
  let prevXpx = (cur.x / 100) * window.innerWidth;
  let prevScroll = window.scrollY;
  let angle = 0;
  let last = performance.now();
  let running = false;

  const apply = () => {
    train.style.setProperty('--x', cur.x.toFixed(3));
    train.style.setProperty('--y', cur.y.toFixed(3));
    train.style.setProperty('--s', cur.s.toFixed(4));
    train.style.setProperty('--o', cur.o.toFixed(3));
    train.style.setProperty('--rack', cur.rack.toFixed(3));
    const big = `rotate(${(angle + bigPhase).toFixed(3)})`;
    const pin = `rotate(${(-angle * (R / r) + pinPhase).toFixed(3)})`;
    bigG.setAttribute('transform', big);
    pinG.setAttribute('transform', pin);
    bigMask?.setAttribute('transform', big);
    pinMask?.setAttribute('transform', pin);
    if (vrack) {
      // Edge rack: teeth spaced at the gear's circular pitch, moving with the page.
      const pitchPx = pitch * ppuAt(cur.s);
      const docked = clamp(1 - Math.abs(cur.x - dockX(cur.s)) / 4);
      vrack.style.setProperty('--pitch', `${pitchPx.toFixed(2)}px`);
      vrack.style.setProperty('--off', `${(-((window.scrollY * DRIVE_RATIO) % pitchPx)).toFixed(2)}px`);
      vrack.style.setProperty('--vo', (docked * Math.min(1, cur.o * 2.2)).toFixed(3));
    }
  };

  const tick = (now: number) => {
    const dt = Math.min(64, now - last);
    last = now;
    const { v: t, tone } = target();
    if (stage.dataset.tone !== tone) stage.dataset.tone = tone;
    const k = 1 - Math.pow(0.0015, dt / 1000);
    cur.x += (t.x - cur.x) * k;
    cur.y += (t.y - cur.y) * k;
    cur.s += (t.s - cur.s) * k;
    cur.o += (t.o - cur.o) * k;
    cur.rack += (t.rack - cur.rack) * k;

    const ppu = ppuAt(cur.s);
    const xpx = (cur.x / 100) * window.innerWidth;
    // Rolling along x (rack below) turns it clockwise; the page sliding up past
    // the edge rack (on its right) turns it anticlockwise. Both are true rolling.
    const roll = (xpx - prevXpx) / ppu;
    const drive = (-(window.scrollY - prevScroll) * DRIVE_RATIO) / ppu;
    prevXpx = xpx;
    prevScroll = window.scrollY;
    angle += ((roll + drive) / R) * (180 / Math.PI);
    apply();

    if (heroVideo?.duration) heroVideo.currentTime = clamp(window.scrollY / window.innerHeight) * heroVideo.duration;

    const settled = Math.abs(t.x - cur.x) < 0.01 && Math.abs(t.y - cur.y) < 0.01 && Math.abs(t.o - cur.o) < 0.002 && Math.abs(t.s - cur.s) < 0.0005 && Math.abs(t.rack - cur.rack) < 0.002;
    if (settled) { running = false; return; }
    requestAnimationFrame(tick);
  };
  const wake = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); } };

  if (reduce) {
    stage.dataset.tone = target().tone;
    apply();
    window.addEventListener('scroll', () => { Object.assign(cur, target().v); stage.dataset.tone = target().tone; apply(); }, { passive: true });
  } else {
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', () => { measure(); prevXpx = (cur.x / 100) * window.innerWidth; wake(); });
    window.addEventListener('load', () => { measure(); wake(); });
    new ResizeObserver(() => { measure(); wake(); }).observe(document.body);
    apply();
    wake();
  }
  heroVideo?.pause();
}

/* ---------------- Services: hover preview (desktop) ---------------- */
const float = $('[data-float]');
if (float && window.matchMedia('(hover: hover) and (min-width: 1024px)').matches) {
  const imgs = $$('.svc__float-img', float);
  let mx = 0, my = 0, fx = 0, fy = 0, live = false;
  const follow = () => {
    fx += (mx - fx) * 0.18; fy += (my - fy) * 0.18;
    float.style.transform = `translate(${fx - 150}px, ${fy - 112}px) rotate(${(mx - fx) * 0.04}deg)`;
    if (live) requestAnimationFrame(follow);
  };
  $$('[data-preview]').forEach((s) => {
    s.addEventListener('mouseenter', () => {
      imgs.forEach((im, i) => im.classList.toggle('on', i === Number(s.dataset.preview)));
      float.classList.add('on');
      if (!live) { live = true; fx = mx; fy = my; requestAnimationFrame(follow); }
    });
    s.addEventListener('mouseleave', () => { float.classList.remove('on'); live = false; });
  });
  window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
}

/* ---------------- Process rail ---------------- */
const rail = $('[data-rail]');
if (rail) {
  const upd = () => {
    const rr = rail.getBoundingClientRect();
    const vh = window.innerHeight;
    rail.style.setProperty('--fill', clamp((vh * 0.75 - rr.top) / (rr.height + vh * 0.25)).toFixed(3));
  };
  window.addEventListener('scroll', upd, { passive: true });
  upd();
}

/* ---------------- Before / after ---------------- */
$$('[data-ba]').forEach((ba) => {
  const range = $<HTMLInputElement>('[data-ba-range]', ba);
  range?.addEventListener('input', () => ba.style.setProperty('--pos', `${range.value}%`));
});

/* ---------------- Quote form ---------------- */
const form = $<HTMLFormElement>('[data-q2]');
if (form) {
  const tabs = $$<HTMLButtonElement>('[data-mode]');
  const modeInput = $<HTMLInputElement>('[data-mode-input]', form)!;
  const more = $('[data-quote-only]', form)!;
  const submitBtn = $<HTMLButtonElement>('[data-submit-label]', form)!;
  const status = $('[data-status]', form)!;
  const done = $('[data-done]');
  const fileInput = $<HTMLInputElement>('[data-file]', form);
  const fileLabel = $('[data-file-label]', form);
  const msg = form.elements.namedItem('message') as HTMLTextAreaElement;
  let fileBlob: Blob | null = null;
  let fileName = '';
  const tsInput = $<HTMLInputElement>('[data-ts]', form)!;
  const proof = $<HTMLInputElement>('[data-proof]', form)!;
  const started = Date.now();
  tsInput.value = String(started);

  const setMode = (m: 'callback' | 'quote') => {
    modeInput.value = m;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.mode === m)));
    more.hidden = m !== 'quote';
    submitBtn.firstChild!.textContent = m === 'quote' ? 'Send for a quote ' : 'Call me back ';
  };
  tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode as 'callback' | 'quote')));
  $('[data-add-email]', form)?.addEventListener('click', (e) => {
    (e.currentTarget as HTMLElement).hidden = true;
    const f = $('[data-email]', form)!;
    f.hidden = false;
    $<HTMLInputElement>('input', f)?.focus();
  });

  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-service]');
    if (!a?.dataset.service) return;
    setMode('quote');
    if (msg && !msg.value) msg.value = `${a.dataset.service}: `;
  });

  fileInput?.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    fileBlob = null; fileName = '';
    status.textContent = '';
    if (!f) { if (fileLabel) fileLabel.textContent = 'Add a photo or drawing'; return; }
    try {
      if (f.type.startsWith('image/') && !/heic|heif/i.test(f.type)) {
        const bmp = await createImageBitmap(f);
        const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas');
        c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
        c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
        fileBlob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.82));
        fileName = f.name.replace(/\.[^.]+$/, '') + '.jpg';
      } else {
        fileBlob = f; fileName = f.name;
      }
      if (fileBlob && fileBlob.size > 4 * 1024 * 1024) { status.textContent = 'That file is over 4 MB — please send a smaller one or call us.'; fileBlob = null; fileInput.value = ''; return; }
      if (fileLabel) fileLabel.textContent = `📎 ${f.name}`;
    } catch {
      fileBlob = f; fileName = f.name;
      if (fileLabel) fileLabel.textContent = `📎 ${f.name}`;
    }
  });

  const phoneOk = (v: string) => /^(\+?61|0)[2-478]\d{8}$/.test(v.replace(/[\s()-]/g, ''));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    const name = form.elements.namedItem('name') as HTMLInputElement;
    const phone = form.elements.namedItem('phone') as HTMLInputElement;
    [name, phone].forEach((i) => i.removeAttribute('aria-invalid'));
    if (name.value.trim().length < 2) { name.setAttribute('aria-invalid', 'true'); name.focus(); status.textContent = 'Please add your name.'; return; }
    if (!phoneOk(phone.value)) { phone.setAttribute('aria-invalid', 'true'); phone.focus(); status.textContent = 'Please enter an Australian phone number.'; return; }

    proof.value = btoa(`${started}:${navigator.userAgent.length}:${Date.now() - started}`);
    const data = new FormData(form);
    data.delete('file');
    if (fileBlob && modeInput.value === 'quote') data.append('file', fileBlob, fileName);

    submitBtn.disabled = true;
    const label = submitBtn.firstChild!.textContent;
    submitBtn.firstChild!.textContent = 'Sending… ';
    try {
      const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || 'Something went wrong.');
      form.hidden = true;
      $('.q__tabs')?.setAttribute('hidden', '');
      if (done) { done.hidden = false; done.focus(); }
      (window as any).dataLayer?.push({ event: 'generate_lead', mode: modeInput.value });
    } catch (err) {
      status.textContent = `${(err as Error).message} Please call us instead.`;
      submitBtn.disabled = false;
      submitBtn.firstChild!.textContent = label;
    }
  });
}
