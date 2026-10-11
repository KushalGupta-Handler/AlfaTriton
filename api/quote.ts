/**
 * Vercel Function: POST /api/quote  (also serves /quote.php via vercel.json rewrite)
 *
 * Env vars (Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY    required — https://resend.com (free tier is plenty)
 *   QUOTE_TO          where enquiries go       (default sales@alfatriton.com)
 *   QUOTE_FROM        verified sender address  (default "Alfa Triton Website <onboarding@resend.dev>")
 *   TURNSTILE_SECRET  optional Cloudflare Turnstile secret
 *
 * Spam layers: honeypot · minimum fill time · browser proof token · AU phone
 * check · link/keyword scoring (flags, never silently drops a real lead) ·
 * per-IP rate limit · optional Turnstile.
 */

const MAX_FILE_BYTES = 4 * 1024 * 1024; // Vercel request body limit is 4.5 MB
const ALLOWED_EXT = /\.(pdf|dwg|dxf|step|stp|igs|iges|jpe?g|png|webp|heic)$/i;
const SPAM_WORDS = /\b(seo|backlinks?|guest post|web ?design|website redesign|digital marketing|ranking|first page of google|crypto|bitcoin|casino|loan|lead generation|outsourc\w*|virtual assistant|app development)\b/i;

const hits = new Map<string, number[]>(); // best-effort, per warm instance

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function reply(req: Request, ok: boolean, error = '', status = 200): Response {
  const wantsJson = (req.headers.get('accept') || '').includes('application/json');
  if (wantsJson) return json({ ok, error }, ok ? 200 : status);
  if (ok) return new Response(null, { status: 303, headers: { Location: '/thank-you/' } });
  return new Response(`<p>${error} Please call 02 9642 2899.</p><p><a href="/">Back</a></p>`, { status, headers: { 'Content-Type': 'text/html' } });
}

const str = (v: FormDataEntryValue | null, max = 200) =>
  typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';

export function phoneLooksAustralian(v: string): boolean {
  return /^(\+?61|0)[2-478]\d{8}$/.test(v.replace(/[\s()-]/g, ''));
}

export function spamScore(text: string): number {
  let s = 0;
  const links = (text.match(/https?:\/\/|www\./gi) || []).length;
  s += links * 2;
  if (SPAM_WORDS.test(text)) s += 3;
  if (/[Ѐ-ӿ一-鿿]/.test(text)) s += 2; // Cyrillic / CJK in an AU B2B form
  return s;
}

export async function POST(req: Request): Promise<Response> {
  let form: FormData;
  try { form = await req.formData(); } catch { return reply(req, false, 'Invalid submission.', 400); }

  // 1. Honeypot & 2. fill-time: pretend success so bots learn nothing.
  if (str(form.get('website'))) return reply(req, true);
  const ts = Number(str(form.get('ts')));
  if (ts && Date.now() - ts < 3000) return reply(req, true);

  // 3. Rate limit (5 per IP per hour, per instance).
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => t > now - 3600_000);
  if (recent.length >= 5) return reply(req, false, 'Too many submissions.', 429);
  recent.push(now);
  hits.set(ip, recent);

  // 4. Turnstile (when configured).
  const secret = process.env.TURNSTILE_SECRET;
  if (secret) {
    const body = new URLSearchParams({ secret, response: str(form.get('cf-turnstile-response'), 4000), remoteip: ip });
    const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body }).then((r) => r.json()).catch(() => ({}));
    if (!(v as { success?: boolean }).success) return reply(req, false, 'Spam check failed — please try again.', 400);
  }

  // 5. Fields (supports both the V2 form and the V1 multi-step form).
  const isV2 = form.has('mode');
  const f = {
    mode: str(form.get('mode')) || 'quote',
    name: str(form.get('name'), 80),
    phone: str(form.get('phone'), 30),
    email: str(form.get('email'), 120),
    company: str(form.get('company'), 120),
    service: str(form.get('service'), 80),
    urgency: str(form.get('urgency'), 60),
    industry: str(form.get('industry'), 60),
    location: str(form.get('location'), 80),
    siteVisit: str(form.get('site_visit')) === 'yes' ? 'Yes' : '',
    source: str(form.get('source'), 60),
    message: typeof form.get('message') === 'string' ? String(form.get('message')).trim().slice(0, 3000) : '',
  };

  if (isV2) {
    // Browser proof token set by our JS at submit time: "<start>:<n>:<elapsed>"
    let proofOk = false;
    try { proofOk = /^\d{13}:\d+:\d+$/.test(atob(str(form.get('proof'), 200))); } catch { /* invalid */ }
    if (!proofOk) return reply(req, true); // direct POST from a bot
  }
  if (f.name.length < 2 || !f.phone) return reply(req, false, 'Please add your name and phone.', 422);
  if (isV2 && !phoneLooksAustralian(f.phone)) return reply(req, false, 'Please enter an Australian phone number.', 422);
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return reply(req, false, 'Please check your email address.', 422);

  // 6. Attachments.
  const attachments: { filename: string; content: string }[] = [];
  let total = 0;
  for (const entry of [...form.getAll('file'), ...form.getAll('files[]')]) {
    if (typeof entry === 'string' || !entry.size) continue;
    if (!ALLOWED_EXT.test(entry.name)) return reply(req, false, `File type not allowed: ${entry.name}`, 415);
    total += entry.size;
    if (total > MAX_FILE_BYTES) return reply(req, false, 'Attachments must total under 4 MB.', 413);
    const buf = Buffer.from(await entry.arrayBuffer());
    attachments.push({ filename: entry.name.replace(/[^\w.-]/g, '_').slice(0, 100), content: buf.toString('base64') });
    if (attachments.length >= 5) break;
  }

  // 7. Spam scoring: flag, don't drop (a real customer is never lost).
  const score = spamScore(`${f.name} ${f.company} ${f.message} ${f.email}`);
  const urgent = /urgent|breakdown/i.test(`${f.urgency} ${f.service}`);
  const kind = f.mode === 'callback' ? 'Callback request' : 'Quote request';
  const subject = `${score >= 3 ? '[Possible spam] ' : ''}${urgent ? '[URGENT] ' : ''}${kind}: ${f.name}${f.service ? ` — ${f.service}` : ''}`;
  const details = [
    `Name:       ${f.name}`,
    `Phone:      ${f.phone}`,
    f.email && `Email:      ${f.email}`,
    f.company && `Company:    ${f.company}`,
    f.service && `Service:    ${f.service}`,
    f.urgency && `Urgency:    ${f.urgency}`,
    f.industry && `Industry:   ${f.industry}`,
    f.location && `Location:   ${f.location}`,
    f.siteVisit && `Site visit: ${f.siteVisit}`,
    f.source && `Found us:   ${f.source}`,
  ].filter(Boolean).join('\n');
  const lines = [
    `${kind} from the website`,
    details,
    f.message ? `Message:\n${f.message}` : '(no message — please call back)',
    `Attachments: ${attachments.length} · Spam score: ${score} · IP: ${ip}`,
  ].join('\n\n');

  const key = process.env.RESEND_API_KEY;
  if (!key) return reply(req, false, 'Email is not configured yet.', 503);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.QUOTE_FROM || 'Alfa Triton Website <onboarding@resend.dev>',
      to: (process.env.QUOTE_TO || 'sales@alfatriton.com').split(',').map((s) => s.trim()),
      subject,
      text: lines,
      ...(f.email ? { reply_to: f.email } : {}),
      ...(attachments.length ? { attachments } : {}),
      headers: urgent ? { 'X-Priority': '1' } : undefined,
    }),
  });
  if (!res.ok) return reply(req, false, 'Sorry, we could not send your enquiry.', 502);
  return reply(req, true);
}
