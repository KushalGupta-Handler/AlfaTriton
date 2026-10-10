// Progressive enhancements. The page is fully usable without any of this.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));

/* ---------- Header: scrolled state + mobile menu ---------- */
const header = $('[data-header]');
const nav = $('[data-nav]');
const menuBtn = $<HTMLButtonElement>('[data-menu-btn]');

function setMenu(open: boolean) {
  if (!nav || !menuBtn || !header) return;
  if (open) nav.style.setProperty('--nav-top', `${header.getBoundingClientRect().bottom}px`);
  nav.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.style.overflow = open ? 'hidden' : '';
}
menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
nav?.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
window.matchMedia('(min-width: 1024px)').addEventListener('change', () => setMenu(false));

/* ---------- Scroll-linked effects (one rAF loop) ---------- */
const hero = $('[data-hero]');
const heroVideo = $<HTMLVideoElement>('[data-hero-video]');
const captions = $$('[data-caption]');
const mobilebar = $('.mobilebar');
const steps = $('[data-steps]');
let ticking = false;
let quoteInView = false;
const quoteSection = $('#quote');
if (quoteSection && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => { quoteInView = e.isIntersecting; onScroll(); }, { threshold: 0.15 }).observe(quoteSection);
}

function onScroll() {
  const y = window.scrollY;
  const vh = window.innerHeight;
  header?.classList.toggle('is-scrolled', y > 8);
  mobilebar?.classList.toggle('is-visible', y > vh * 0.6 && !quoteInView);

  if (hero && !reduceMotion) {
    const rect = hero.getBoundingClientRect();
    const range = hero.offsetHeight - vh;
    const p = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;
    hero.style.setProperty('--p', p.toFixed(4));
    hero.classList.toggle('is-past', p > 0.22);
    // Captions sequence across the remaining scroll once the intro text has faded.
    const idx = p < 0.22 ? -1 : Math.min(captions.length - 1, Math.floor(((p - 0.22) / 0.78) * captions.length));
    captions.forEach((c, i) => c.classList.toggle('is-active', i === idx));
    // Higgsfield video: scrub to scroll position.
    if (heroVideo && heroVideo.duration) heroVideo.currentTime = p * heroVideo.duration;
  }

  if (steps) {
    const r = steps.getBoundingClientRect();
    const fill = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
    steps.style.setProperty('--fill', fill.toFixed(3));
  }
  ticking = false;
}
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
heroVideo?.addEventListener('loadedmetadata', onScroll);
heroVideo?.pause();
onScroll();

/* ---------- Reveal on scroll + count-up ---------- */
function countUp(el: HTMLElement) {
  const target = Number(el.dataset.count);
  if (!target || reduceMotion) return;
  const start = performance.now();
  const dur = 1400;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(tick);
  };
  el.textContent = '0';
  requestAnimationFrame(tick);
}
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      $$('[data-count]', e.target).forEach(countUp);
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('.reveal').forEach((el) => io.observe(el));
} else {
  $$('.reveal').forEach((el) => el.classList.add('is-in'));
}

/* ---------- Horizontal scrollers: progress bar ---------- */
$$('[data-scroller]').forEach((sc) => {
  const bar = sc.parentElement?.querySelector<HTMLElement>('[data-scroller-bar]');
  if (!bar) return;
  const update = () => {
    const max = sc.scrollWidth - sc.clientWidth;
    const ratio = sc.clientWidth / sc.scrollWidth;
    bar.style.width = `${Math.max(ratio * 100, 12)}%`;
    bar.style.transform = `translateX(${max > 0 ? (sc.scrollLeft / max) * ((1 / Math.max(ratio, 0.12)) - 1) * 100 : 0}%)`;
  };
  sc.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
});

/* ---------- Before / after slider ---------- */
$$('[data-ba]').forEach((ba) => {
  const range = $<HTMLInputElement>('[data-ba-range]', ba);
  range?.addEventListener('input', () => ba.style.setProperty('--pos', `${range.value}%`));
});

/* ---------- Tabs (spec sheet) ---------- */
$$('[data-tabs]').forEach((root) => {
  const tabs = $$<HTMLButtonElement>('[role="tab"]', root);
  const select = (tab: HTMLButtonElement, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls') || '');
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (dir) { e.preventDefault(); select(tabs[(i + dir + tabs.length) % tabs.length], true); }
    });
  });
});

/* ---------- Quote form: steps, prefill, validation, async submit ---------- */
const form = $<HTMLFormElement>('[data-quote-form]');
if (form) {
  const stepsEls = $$<HTMLFieldSetElement>('[data-step]', form);
  const progress = $$('.qf__progress li', form);
  const next = $<HTMLButtonElement>('[data-next]', form)!;
  const prev = $<HTMLButtonElement>('[data-prev]', form)!;
  const submit = $<HTMLButtonElement>('[data-submit]', form)!;
  const status = $('[data-status]', form)!;
  const done = $('[data-done]');
  const ts = $<HTMLInputElement>('[data-ts]', form);
  const urgentAlert = $('[data-urgent-alert]', form);
  const urgency = form.elements.namedItem('urgency') as HTMLSelectElement | null;
  let current = 0;
  if (ts) ts.value = String(Date.now());

  const show = (i: number) => {
    current = i;
    stepsEls.forEach((s, j) => s.classList.toggle('is-current', j === i));
    progress.forEach((p, j) => { p.classList.toggle('is-current', j === i); p.classList.toggle('is-done', j < i); });
    prev.hidden = i === 0;
    next.hidden = i === stepsEls.length - 1;
    submit.hidden = i !== stepsEls.length - 1;
    status.textContent = '';
  };

  const validate = (fs: HTMLElement) => {
    const fields = $$<HTMLInputElement>('input, select, textarea', fs).filter((f) => f.name !== 'website');
    for (const f of fields) {
      f.removeAttribute('aria-invalid');
      if (!f.checkValidity()) {
        f.setAttribute('aria-invalid', 'true');
        status.textContent = f.type === 'radio' ? 'Please choose what you need.' : `Please check: ${f.closest('label')?.querySelector('span')?.textContent?.replace('*', '').trim() || f.name}.`;
        if (f.type !== 'radio') f.focus();
        return false;
      }
    }
    return true;
  };

  next.addEventListener('click', () => { if (validate(stepsEls[current])) { show(current + 1); form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); } });
  prev.addEventListener('click', () => show(current - 1));

  // Urgent selection → nudge to call
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'service') {
      const urgent = t.value.startsWith('Breakdown');
      if (urgentAlert) urgentAlert.hidden = !urgent;
      if (urgent && urgency) urgency.value = 'Urgent — line is down';
    }
  });

  // Prefill service from any "Get a quote" link with data-service
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-service]');
    if (!a?.dataset.service) return;
    const radios = $$<HTMLInputElement>('input[name="service"]', form);
    const match = radios.find((r) => r.value === a.dataset.service);
    if (match) { match.checked = true; match.dispatchEvent(new Event('change', { bubbles: true })); }
    show(0);
  });

  // File list feedback
  const fileInput = $<HTMLInputElement>('[data-file-input]', form);
  const fileList = $('[data-file-list]', form);
  fileInput?.addEventListener('change', () => {
    const files = Array.from(fileInput.files || []);
    const tooBig = files.find((f) => f.size > 10 * 1024 * 1024);
    if (files.length > 5 || tooBig) {
      status.textContent = files.length > 5 ? 'Please attach up to 5 files.' : `${tooBig!.name} is over 10 MB.`;
      fileInput.value = '';
      if (fileList) fileList.textContent = '';
      return;
    }
    status.textContent = '';
    if (fileList) fileList.textContent = files.map((f) => `📎 ${f.name}`).join('  ');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    for (let i = 0; i < stepsEls.length; i++) { if (!validate(stepsEls[i])) { show(i); validate(stepsEls[i]); return; } }
    submit.disabled = true;
    submit.textContent = 'Sending…';
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong.');
      form.hidden = true;
      if (done) { done.hidden = false; done.focus(); }
      // Conversion hook for analytics (GA4 / Google Ads) once installed.
      (window as any).dataLayer?.push({ event: 'generate_lead', service: (form.elements.namedItem('service') as RadioNodeList)?.value });
    } catch (err) {
      status.textContent = `${(err as Error).message} Please call 02 9642 2899 or email sales@alfatriton.com.`;
      submit.disabled = false;
      submit.textContent = 'Send my enquiry';
    }
  });

  show(0);
}
