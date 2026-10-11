# Alfa Triton Engineering — website

Mobile-first, lead-focused website for **Alfa Triton Engineering** (Alfa Triton Products Pty Ltd), Clyde NSW.

- **Stack:** [Astro](https://astro.build) static site · vanilla CSS (design tokens in `src/styles/global.css`) · ~6 KB of JavaScript · PHP form handler
- **Output:** plain HTML/CSS/JS in `dist/` — uploads to any cPanel host (Havealook) with no server runtime beyond PHP for the form.

## Versions

| URL | Design | Notes |
|---|---|---|
| `/` | **V3** (live default): full-page gear, time-aware calls, early proof, no duplicates | Clean: no design switcher. `/v3/` redirects here |
| `/v1/` | **V1**: detailed, multi-section | Kept for comparison, `noindex` |
| `/v2/` | **V2**: "machined graphite", rolling gear in the first three sections | Kept for comparison, `noindex` |

V3 is still `noindex` (set in `LayoutV3.astro`) while it's a review build on vercel.app; remove that once it goes live on alfatriton.com.au.

A small **Design V1 / V2** tab on the right edge of both pages switches between them (`src/components/VersionSwitch.astro`; delete it once a version is chosen).
To make V2 the live homepage: move `src/pages/v2/index.astro` to `src/pages/index.astro`, remove the `noindex` meta in `LayoutV2.astro`, and update the anchors in `vercel.json` redirects.

### V2 highlights
- **Gear train** (`GearStage.astro` + `src/scripts/v2.ts`): a 40-tooth gear and 14-tooth pinion roll along a rack through the hero, services and process sections. Rotation is derived from travel (θ = Δx / r), so it genuinely rolls; positions are keyframed per section with `data-gear` (desktop) and `data-gear-m` (mobile) as `x%,y%,scale,opacity`.
- **Services index**: numbered list; tap to expand on mobile, cursor-following photo preview on desktop.
- **How we work**: 4 steps with timings and a scroll-filled rail.
- **Before/after**: full-width restoration slider.
- **Quote**: "Call me back" needs only name + phone; "Quote with photo" adds optional details and one photo (auto-shrunk in the browser). Big tap-to-call numbers sit beside the form so people can skip it entirely.

### V3 changes (from the V2 review)
- **Full-page gear** (`GearStageV3.astro`, `src/scripts/v3.ts`): a fixed layer above section backgrounds and below content (`.wrap` is `z-index: 2`; sections must not create stacking contexts). It turns for the whole scroll, rolling along a rack in the hero, then docks at the right edge with an edge rack driving it (2:1 reduction), recolours on the light section, and settles beside the footer. A fixed light "glint" masked by the turning gear gives the look of machined steel. Use `data-gear="D,…"` to dock a section.
- **Time-aware call buttons**: in business hours (`site.businessHours`, Sydney time) "Call" dials the workshop; after hours it dials the 24/7 line. [Need update from Oliver: exact hours]
- **Early proof**: a strip of real job photos right after the hero, and a "Who you'll deal with" section with workshop photos, a testimonial slot and a client/certification logo slot.
- **Removed**: the stats block (repeated earlier content), the hero RPM/spec strip, the gear annotations, section numbering, repeated FAQs, and the industry "chips" (now a plain text line).
- The design switcher now shows only near the top of the page, and V3 also links V1/V2 in the footer.

## Spam protection (Oliver's pain point)

Layered so real customers never notice, and a real lead is never silently dropped:

1. **Less to abuse**: 2 required fields, no free-text required, no email address printed in V2 (scraped emails are a big spam source).
2. **Honeypot field**: hidden from people; bots fill it and get a fake "success".
3. **Fill-time trap**: submissions faster than 3 s are discarded.
4. **Browser proof token**: V2 sets a token at submit time; bots that POST straight to the endpoint don't have it.
5. **Australian phone check**: on both the client and the server.
6. **Content scoring**: links, SEO and marketing phrases, and foreign scripts tag the email subject `[Possible spam]` instead of deleting it.
7. **Rate limit**: 5 per IP per hour.
8. **Cloudflare Turnstile** (optional, invisible): add the site key in `QuoteV2.astro` / `QuoteForm.astro` and `TURNSTILE_SECRET` in Vercel.
9. A polite "No sales or marketing enquiries, please" line under the form.

## Vercel

- `vercel.json` sets the framework, the 301s from the old site, and the security headers, and rewrites `/quote.php` → `/api/quote` so the V1 form works too.
- `api/quote.ts` is a Vercel Function that emails enquiries through [Resend](https://resend.com). In Vercel → Settings → Environment Variables add:
  - `RESEND_API_KEY` (required)
  - `QUOTE_TO` (default `sales@alfatriton.com`; comma-separate multiple)
  - `QUOTE_FROM` (e.g. `Alfa Triton Website <website@alfatriton.com.au>` once the domain is verified in Resend)
  - `TURNSTILE_SECRET` (optional)
- `public/quote.php` + `public/.htaccess` remain only for cPanel hosting; Vercel ignores them.

## Commands

```bash
npm install
npm run dev       # local dev server → http://localhost:4321
npm run build     # production build → dist/
npm run preview   # serve the build
```

## Deploy (cPanel / Havealook)

1. `npm run build`
2. Upload the **contents** of `dist/` to `public_html/` (includes `.htaccess`, `quote.php`, `robots.txt`, `sitemap-index.xml`).
3. Edit the config block at the top of `public_html/quote.php` (recipient email, `FROM_EMAIL` on the domain, Turnstile secret).
4. Send a test enquiry and confirm delivery (check spam; add SPF/DKIM for the domain if needed).

The `.htaccess` 301-redirects every old page (`/welding.html`, `/contact.html` …) to the matching new section, so existing Google rankings carry over.

## Home page structure

| # | Section | Purpose |
|---|---|---|
| 1 | Top bar + sticky header | 24/7 number always one tap away; "Get a quote" CTA |
| 2 | **Scroll hero** (`Hero.astro`) | Headline, 2 CTAs, trust chips; 3 scroll-driven captions |
| 3 | Stats strip | 52 yrs · 24/7 · 2 m gears · 12-mo warranty (count-up) |
| 4 | "How can we help?" | 3 intent paths: line down / parts / equipment |
| 5 | Services | 6 capabilities — swipe carousel on mobile, grid on desktop |
| 6 | Industries | 6 industries, kinetic ticker, client-logo row |
| 7 | Projects | Before/after restoration slider + case-study cards |
| 8 | Process | 5 steps with scroll-filled progress rail |
| 9 | Why Alfa Triton | Differentiators, est. 1974 stamp, certifications |
| 10 | Spec sheet | Tabbed capacities: welding, gears, machining, materials |
| 11 | Service area | Animated SVG map (Central Coast ↔ Wollongong ↔ Blue Mtns) |
| 12 | Testimonials | Placeholders until real quotes arrive |
| 13 | FAQ | Answer-first Q&A (also FAQPage schema for SEO/AEO) |
| 14 | Quote form | 3-step form, file upload, urgent → call nudge, spam-protected |
| 15 | CTA band + footer + mobile action bar | Call / Quote always reachable on phones |

## Higgsfield hero animation

The hero is already built for a scroll-scrubbed video.

1. Export the Higgsfield animation as MP4 (portrait-friendly framing; keep the subject centre-right so text stays legible on the left/bottom).
2. Re-encode with every frame as a keyframe so scrubbing is smooth:
   ```bash
   ffmpeg -i higgsfield.mp4 -an -vf "scale=1280:-2" -c:v libx264 -g 1 -crf 23 -pix_fmt yuv420p public/media/hero.mp4
   ffmpeg -i public/media/hero.mp4 -frames:v 1 public/media/hero-poster.webp
   ```
   Optional lighter mobile cut: `scale=720:-2` → `hero-mobile.mp4`.
3. In `src/components/Hero.astro` set `videoSrc = '/media/hero.mp4'` and `videoPoster = '/media/hero-poster.webp'`.

`src/scripts/main.ts` maps scroll progress (`--p`, 0→1) to `video.currentTime`. Users with *reduced motion* get a static hero.

## Review markers

Anything that needs confirmation shows a visible amber tag on the page:

- **`[Need update from Oliver: …]`** — text/facts to confirm (`NeedsUpdate.astro`)
- **Amber image badge** — placeholder or low-res photo to replace (`Photo.astro`, `badge` prop)

Business facts live in **`src/data/site.ts`** (single source of truth). To hide every marker for a launch preview, add `class="hide-review"` to `<html>` in `src/layouts/Base.astro` — but resolve them all before going live.

### Launch checklist — needed from Oliver

- [ ] Workshop address: Clyde (18 Wentworth St) or Greenacre? (old site mentions both)
- [ ] 24/7 after-hours number (0439 671 559 vs 0407 422 899) and main email
- [ ] Opening hours, ABN, response-time promise ("within one business day"?)
- [ ] Certifications / accreditations (ISO, welding tickets, safety)
- [ ] 10–20 high-res job photos (food & pharma stainless work especially), team & workshop photos
- [ ] Before/after restoration: client/industry and turnaround
- [ ] Project outcomes/clients for each case study, and OK to show CAD drawings
- [ ] Client logos (with permission) and 3 real testimonials
- [ ] Full equipment list
- [ ] Interstate freight — yes/no
- [ ] Google Business Profile, LinkedIn, Instagram links
- [ ] Confirm rights to the hero/OG photo (`cnc-turning.jpg` came from the old site)
- [ ] Privacy policy review

### Technical launch checklist

- [ ] Cloudflare Turnstile: set site key in `QuoteForm.astro`, secret in `quote.php`
- [ ] Domain mailbox for `FROM_EMAIL`; SPF/DKIM so enquiries don't land in spam
- [ ] Analytics (GA4 or Plausible) — the form already pushes a `generate_lead` event to `dataLayer`
- [ ] Google Search Console: submit `sitemap-index.xml`
- [ ] Claim/update Google Business Profile with the same name, address, phone (NAP)

## SEO / AEO built in

- Unique title + meta description, canonical, Open Graph/Twitter card (`public/og-image.jpg`)
- JSON-LD: `LocalBusiness` (founding date, geo, area served, emergency contact, services), `WebSite`, `FAQPage`
- Semantic sections with a single H1, descriptive alt text, answer-first FAQ copy
- `sitemap-index.xml`, `robots.txt`, and `llms.txt` (a plain-text summary of the business for AI assistants)
- Responsive WebP images, self-hosted fonts, ~6 KB JS, no layout-blocking third-party scripts
