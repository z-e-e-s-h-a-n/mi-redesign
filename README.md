# MI MedCare — homepage redesign

A ground-up redesign of the marketing homepage for **MI MedCare LLC**, a HIPAA-compliant
medical billing / revenue cycle management company (Sacramento, CA &amp; Manassas, VA).

Zero build step, zero runtime dependencies. Open `index.html` in a browser, or serve the
folder with any static host.

```
python3 -m http.server 8080   # then open http://localhost:8080
```

## Files

```
index.html              the homepage
assets/css/styles.css   design tokens + every component
assets/js/hero.js       the 3D hero field (raw WebGL, ~250 lines, no libraries)
assets/js/main.js       nav, theme, reveals, counters, cycle tabs, ROI calc, search, form
```

## What's on the page

| Section | Purpose |
| --- | --- |
| Hero | 3D WebGL claim-network field + a live "Claims Console" card |
| Trust strip | 98% clean claims · 40% fewer denials · 500+ providers · 1,100+ billers · 40+ specialties |
| The problem | Where practice revenue actually leaks |
| Services | Billing, coding, credentialing, denial management, eligibility, analytics |
| Revenue cycle | Interactive 8-stage walkthrough of a claim, keyboard-navigable |
| ROI calculator | Live estimate of revenue lost to denials — no form gate |
| Specialties | 50 searchable specialties, filtered as you type |
| Proof | Testimonial, outcome stats, in-house vs. outsourced comparison |
| Onboarding | The 14-day go-live path |
| FAQ | The six questions practices ask first |
| Free revenue audit | The primary conversion form |

## Design system

Everything is driven by CSS custom properties on `:root`, so colors, radii and rhythm are
changed in one place. `:root[data-theme="light"]` re-declares the same tokens — the light
theme is a token swap, not a second stylesheet. The toggle persists to `localStorage`.

- **Display type** Space Grotesk · **Body** Inter (Google Fonts, with system fallbacks)
- **Brand gradient** `#00E5C0 → #4F7CFF → #A855F7` (mint → blue → violet)
- **Surfaces** translucent layers over a near-black navy, glass-blurred

## The 3D hero

`assets/js/hero.js` is hand-written WebGL — no Three.js, nothing to download. It builds a
hollow shell of ~190 points, pre-computes proximity links between them on the CPU, and
renders both with a perspective matrix that rotates slowly and parallaxes with the pointer.

It is written to be a good citizen:

- Silently does nothing if WebGL is unavailable (the page is complete without it)
- Pauses via `IntersectionObserver` when the hero scrolls away, and on `visibilitychange`
- Device pixel ratio capped at 2; point count halved on small screens
- Renders a single static frame under `prefers-reduced-motion`
- Additive blending in dark mode, normal alpha compositing in light mode

## Accessibility

- Semantic landmarks, skip link, visible focus rings on every interactive element
- Revenue-cycle stages are real ARIA tabs with arrow-key navigation; auto-advance stops on
  hover or focus
- FAQ uses native `<details>`/`<summary>`
- Every animation respects `prefers-reduced-motion`
- Form fields validate on blur with inline, text-based errors and focus management
- Verified at 390px with no horizontal overflow

## Wiring it up for production

1. **The audit form** (`#auditForm`) is front-end only. Point the submit handler in
   `assets/js/main.js` at your CRM or form endpoint — look for the
   `Front-end only: wire this to your CRM / form endpoint` comment.
2. **Analytics** — no tracker is included; add yours in `<head>`.
3. **Legal pages** — the Privacy / Terms / HIPAA Notice footer links are placeholders.
4. **Claim feed** — the hero console cycles illustrative sample data, not live claims.

## Content accuracy

Company facts (metrics, services, specialties, phone, email, address) come from
mimedcarellc.com. Industry figures in "the problem" section (65% of denials never reworked,
~$25 to rework a claim, 45+ days in A/R) are stated as industry norms, and the ROI
calculator labels its own assumptions inline — swap in MI MedCare's own audited numbers
before launch if you'd rather cite first-party data.
