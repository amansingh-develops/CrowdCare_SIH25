CrowdCare Badge Icon Pack

Flat, minimal, accessible SVG badges (48x48) for CrowdCare gamification. Consistent stroke, rounded corners, no gradients, Tailwind-inspired colors.

Files

- first-report.svg — First Report (pin marker)
- verified-reporter.svg — Verified Reporter (shield + check)
- community-ally.svg — Community Ally (handshake)
- evidence-pro.svg — Evidence Pro (camera + GPS pin)
- no-duplicate-champ.svg — No-Duplicate Champ (shield + NO)
- impact-under-sla.svg — Impact Under SLA (stopwatch)
- eco-warrior.svg — Eco Warrior (sprouting leaf)
- neighborhood-guardian.svg — Neighborhood Guardian (marker cluster)
- monthly-top-10.svg — Monthly Top 10 (trophy)

Usage (React/Vite)

```tsx
// Option 1: Import as URL (no color control via Tailwind currentColor)
import firstReport from "@/assets/badges/first-report.svg";
<img src={firstReport} alt="First Report badge" />

// Option 2: Inline SVG or SVGR to allow Tailwind color control
// Install: npm i -D @svgr/webpack or use vite-plugin-svgr
// Example with vite-plugin-svgr:
// import FirstReport from '@/assets/badges/first-report.svg?react'
// <FirstReport className="h-6 w-6 text-slate-900" style={{ ['--cc-badge-accent' as any]: '#22d3ee' }} />
```

Design notes

- Primary outlines use `stroke="currentColor"` so parent text color applies (when inlined/SVGR).
- Accent uses CSS var `--cc-badge-accent` with a sensible default per icon.
- To recolor accent: set inline style or a CSS class that defines `--cc-badge-accent`.
- Consistent stroke width: 2, rounded caps/joins, no gradients.
- Scalable via `viewBox="0 0 48 48"`; size with CSS or width/height props.


