# Alfa Triton Engineering — website

Mobile-first, lead-focused website for **Alfa Triton Engineering** (Alfa Triton Products Pty Ltd), Clyde NSW.

- **Stack:** [Astro](https://astro.build) static site · vanilla CSS (design tokens in `src/styles/global.css`) · ~6 KB of JavaScript · PHP form handler
- **Output:** plain HTML/CSS/JS in `dist/` — uploads to any cPanel host (Havealook) with no server runtime beyond PHP for the form.

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
