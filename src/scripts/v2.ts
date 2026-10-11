// V2 interactions. Everything degrades gracefully without JS.
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce) document.documentElement.classList.add('reduced');
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/* ---------------- Header + mobile bar ---------------- */
const hd = $('[data-hd]');
const bar = $('[data-bar]');
const quote = $('#quote');
let quoteVisible = false;
let lastY = window.scrollY;
if (quote) new IntersectionObserver(([e]) => { quoteVisible = e.isIntersecting; }, { threshold: 0.1 }).observe(quote);

function chrome() {
  const y = window.scrollY;
  const vh = window.innerHeight;
  hd?.classList.toggle('is-solid', y > 40);
  hd?.classList.toggle('is-hidden', y > vh && y > lastY + 4 && !document.activeElement?.closest('[data-hd]'));
  if (y < lastY - 4) hd?.classList.remove('is-hidden');
  bar?.classList.toggle('is-on', y > vh * 0.7 && !quoteVisible);
  lastY = y;
}
window.addEventListener('scroll', chrome, { passive: true });
chrome();

/* ---------------- Reveal + count-up ---------------- */
function countUp(el: HTMLElement) {
  const to = Number(el.dataset.count);
  if (!to || reduce) return;
  const t0 = performance.now();
  const step = (t: number) => {
    const k = clamp((t - t0) / 1400);
    el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const io = new IntersectionObserver((es) => {
  for (const e of es) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach(countUp);
    io.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
$$('.rv, .split, .pr__step').forEach((el) => io.observe(el));

/* ---------------- Gear train engine ---------------- */
const zone = $('[data-gz]');
const stage = $('[data-gs]');
const train = $('[data-gs-train]');
const bigG = $('[data-gs-big]');
const pinG = $('[data-gs-pin]');
const rack = $('[data-gs-rack]');
const rpmEl = $('[data-rpm]');
const heroVideo = $<HTMLVideoElement>('[data-hero-video]');

if (zone && stage && train && bigG && pinG && rack) {
  const R = Number(stage.dataset.r);
  const r = Number(stage.dataset.pr);
  const bigPhase = Number(stage.dataset.bigPhase);
  const pinPhase = Number(stage.dataset.pinPhase);
  const sections = $$('[data-gear]', zone);
  type K = { at: number; x: number; y: number; s: number; o: number };
  let keys: K[] = [];
  let zoneEnd = 0;

  const measure = () => {
    const mobile = window.innerWidth < 1024;
    keys = sections.map((sec) => {
      const [x, y, s, o] = ((mobile && sec.dataset.gearM) || sec.dataset.gear || '50,50,1,1').split(',').map(Number);
      return { at: sec.getBoundingClientRect().top + window.scrollY, x, y, s, o };
    });
    keys[0].at = 0;
    const zr = zone.getBoundingClientRect();
    zoneEnd = zr.bottom + window.scrollY;
  };

  const target = (): K => {
    const y = window.scrollY;
    let k = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (y < b.at) {
        const t = smooth(clamp((y - a.at) / (b.at - a.at)));
        k = { at: 0, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: a.s + (b.s - a.s) * t, o: a.o + (b.o - a.o) * t };
        break;
      }
    }
    // Fade the train out as the zone ends.
    const vh = window.innerHeight;
    const fade = clamp((zoneEnd - y - vh * 0.35) / (vh * 0.65));
    return { ...k, o: k.o * fade };
  };

  measure();
  const cur = { ...target() };
  let dist = 0; // rolled distance in SVG units
  let prevXpx = (cur.x / 100) * window.innerWidth;
  let angle = 0;
  let last = performance.now();
  let rpmSmooth = 0;
  let running = false;
  let inZone = true;

  const apply = () => {
    train.style.setProperty('--x', cur.x.toFixed(3));
    train.style.setProperty('--y', cur.y.toFixed(3));
    train.style.setProperty('--s', cur.s.toFixed(4));
    train.style.setProperty('--o', cur.o.toFixed(3));
    const notes = clamp(1 - window.scrollY / (window.innerHeight * 0.5));
    train.style.setProperty('--notes', notes.toFixed(3));
    bigG.setAttribute('transform', `rotate(${(angle + bigPhase).toFixed(3)})`);
    pinG.setAttribute('transform', `rotate(${(-angle * (R / r) + pinPhase).toFixed(3)})`);
    rack.setAttribute('transform', `translate(${(-dist).toFixed(2)} 0)`);
  };

  const tick = (now: number) => {
    const dt = Math.min(64, now - last);
    last = now;
    const t = target();
    const k = 1 - Math.pow(0.0015, dt / 1000); // frame-rate independent easing
    cur.x += (t.x - cur.x) * k;
    cur.y += (t.y - cur.y) * k;
    cur.s += (t.s - cur.s) * k;
    cur.o += (t.o - cur.o) * k;

    // Pure rolling: rotation follows horizontal travel along the rack.
    const xpx = (cur.x / 100) * window.innerWidth;
    const ppu = (train.offsetWidth / 1120) * cur.s; // px per SVG unit
    const dx = (xpx - prevXpx) / ppu;
    prevXpx = xpx;
    dist += dx;
    const dAngle = (dx / R) * (180 / Math.PI);
    angle += dAngle;
    apply();

    if (rpmEl && dt > 0) {
      const rpm = (Math.abs(dAngle) / 360) * (60000 / dt);
      rpmSmooth += (rpm - rpmSmooth) * 0.15;
      rpmEl.textContent = String(Math.round(rpmSmooth)).padStart(3, '0');
    }
    if (heroVideo?.duration) heroVideo.currentTime = clamp(window.scrollY / window.innerHeight) * heroVideo.duration;

    const settled = Math.abs(t.x - cur.x) < 0.01 && Math.abs(t.y - cur.y) < 0.01 && Math.abs(t.o - cur.o) < 0.002 && Math.abs(t.s - cur.s) < 0.0005;
    if (settled && rpmSmooth < 0.5) { running = false; if (rpmEl) rpmEl.textContent = '000'; return; }
    requestAnimationFrame(tick);
  };
  const wake = () => { if (!running && inZone && !reduce) { running = true; last = performance.now(); requestAnimationFrame(tick); } };

  new IntersectionObserver(([e]) => { inZone = e.isIntersecting; if (inZone) wake(); }, { threshold: 0 }).observe(zone);
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', () => { measure(); prevXpx = (cur.x / 100) * window.innerWidth; wake(); });
  window.addEventListener('load', () => { measure(); wake(); });
  apply();
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
    const r = rail.getBoundingClientRect();
    const vh = window.innerHeight;
    rail.style.setProperty('--fill', clamp((vh * 0.75 - r.top) / (r.height + vh * 0.25)).toFixed(3));
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

  // "Quote this" links prefill the quote tab.
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-service]');
    if (!a?.dataset.service) return;
    setMode('quote');
    if (msg && !msg.value) msg.value = `${a.dataset.service}: `;
  });

  // Shrink photos in the browser (keeps uploads fast on 4G and under host limits).
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

    // Proof-of-browser token: bots posting straight to the endpoint won't have it.
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
