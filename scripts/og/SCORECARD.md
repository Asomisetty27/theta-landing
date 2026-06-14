# Theta runtheta.com — Design Iteration Scorecard

**Method (credibility):** each iteration is scored on a FIXED 100-pt weighted rubric
combining (a) hard machine metrics — WCAG contrast ratios, mobile/desktop overflow px,
console errors (from `score-capture.mjs`) — and (b) expert heuristic visual evaluation
of the actual rendered screenshots against explicit per-dimension anchors. The rubric is
frozen so scores are comparable across iterations; each iteration targets the
lowest-scoring dimensions of the prior one.

## Rubric (100 pts)

| # | Dimension | Wt | What max looks like |
|---|-----------|----|---------------------|
| 1 | **Brand distinctiveness** (font+color identifiable) | 20 | A cropped fragment is unmistakably Theta: Clash Display + champagne-on-obsidian + θ-isotherm geometry present and ownable on every surface |
| 2 | Typographic craft | 15 | Clear scale ratio, no widows/orphans, optical alignment, disciplined tracking, one display family |
| 3 | Color & contrast | 15 | All text ≥ WCAG AA (4.5 body / 3.0 large); gold as accent not splash; warm color = state only |
| 4 | Visual hierarchy & focal flow | 12 | One clear focal point per section; CTA prominence; readable eye path |
| 5 | Spacing, rhythm & alignment | 12 | Consistent vertical rhythm; grid alignment; no dead zones or cramping |
| 6 | Motion & micro-interaction polish | 8 | Entrance choreography, hover/focus states, reduced-motion fallback |
| 7 | Consistency & systemization | 8 | Every surface uses the same tokens; no off-system color/spacing/neutral drift |
| 8 | Responsive integrity | 6 | 0 overflow px both viewports; mobile not cramped/broken |
| 9 | Accessibility | 4 | focus-visible, AA contrast, reduced-motion, semantics |

## Iteration log

### Iter 0 — baseline (commit 22e9d8f + uncommitted)
Machine: 0 errors · desktop overflow 0px · mobile overflow 0px · hero H1 contrast 17.5:1
| Dim | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | **Total** |
|-----|---|---|---|---|---|---|---|---|---|-----------|
| Score | 15 | 11 | 9 | 8 | 8 | 6 | 6 | 5 | 2.5 | **70.5** |

Top defects (point loss drivers):
1. **Low-contrast secondary/label text** — metric-strip card sublabels and section
   captions are near-invisible on obsidian (fails AA). Hits dims 3, 4, 9.
2. **Brand pattern under-present** — θ-isotherm ThetaField barely visible in most
   sections; distinctiveness relies almost entirely on the hero. Hits dim 1.
3. **Neutral cool/warm drift** — some `<p>` inherit global shadcn cool blue-gray
   `--foreground` instead of warm Theta platinum. Hits dims 7, 1.
4. Hero on mobile slightly cramped (headline over scene). Hits dims 5, 8.

### Iter 1 — caption contrast + θ-pattern weight
Edits: decoupled `T.faint` caption tier from border tier → `#8A8073` (~5:1, was ~1.9:1);
ThetaField stroke 0.8→1.2, crossbar 0.7→1.0 / opacity 0.25→0.32.
Machine: 0 errors · 0/0 overflow · hero 17.5:1
| Dim | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | **Total** |
|-----|---|---|---|---|---|---|---|---|---|-----------|
| Score | 16 | 11.5 | 12.5 | 9 | 8.5 | 6 | 6.5 | 5 | 3.3 | **78.3** |
Fixed: invisible captions now AA. θ-geometry registers. Remaining: cool-neutral leak; mobile density.

### Iter 2 — palette purity (warm neutrals) + lift faint θ-fields
Edits: warmed global `*-foreground` tokens (cool 210/215 hue → 40 champagne); fixed
hero subhead hardcoded `#9a9aaa` (cool) → warm `T.muted`; raised 3 faintest ThetaField
opacities (0.30–0.35 → 0.40–0.44).
Machine: 0 errors · 0/0 overflow · hero 17.5:1 · body now rgb(168,160,146) warm (was cool 154,154,170)
| Dim | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | **Total** |
|-----|---|---|---|---|---|---|---|---|---|-----------|
| Score | 17.5 | 11.5 | 13 | 9 | 8.5 | 6 | 7.5 | 5 | 3.3 | **81.3** |
Fixed: palette now purely champagne-on-obsidian (the most-viewed body text was off-brand cool).
Remaining defects → iter 3: typographic micro-craft (15→ widows/scale), mobile terminal dead-space,
motion polish (hard to score from stills).

### Iter 3 — brand-glyph touchpoint + audit close-out
Audit finding: headlines ARE consistently Clash Display (rendered via shared SectionHead
component + hero — not a split identity; typography re-scored up). Edit: hero stat eyebrow
index marker `⬚` → `θ` (the brand glyph itself). Confirmed θ-isotherm fields now clearly
visible behind pricing card + gap section (opacity lift from iter 2 landed). Build: clean (exit 0).
Machine: 0 errors · 0/0 overflow · hero 17.5:1 · body warm
| Dim | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | **Total** |
|-----|---|---|---|---|---|---|---|---|---|-----------|
| Score | 18 | 12.5 | 13 | 9 | 8.5 | 6 | 8 | 5 | 3.5 | **83.5** |

### Iter 4 — mixed art direction (dramatic anchors) + Higgsfield asset + mobile
Edits: Higgsfield-rendered isotherm field (nano_banana, 2 credits) as the Gap-section
dramatic backdrop — real thermal-contour θ; data sections keep restrained SVG fields
(the "use one for some, the other for others" direction). Mobile terminal height now
responsive (-1 screenful of scroll). Shipped: commit fa795a0, pushed to main → Vercel.
Machine: 0 errors · 0/0 overflow · hero 17.5:1 · build clean
| Dim | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | **Total** |
|-----|---|---|---|---|---|---|---|---|---|-----------|
| Score | 18.5 | 12.5 | 13 | 9.5 | 9.5 | 6 | 8 | 5.5 | 3.5 | **86.0** |

## Trajectory: 70.5 → 78.3 → 81.3 → 83.5 → 86.0 (+15.5) · SHIPPED fa795a0

NOTE: "Motion in-browser" was verified (reduced-motion fallback present, entrance/
typewriter/reveal animations confirmed firing) but NOT enhanced — adding new
micro-interactions (hover choreography, the brand-spec "thermal pulse") is a dedicated
pass still owed. Motion stays 6/8.

## Remaining ceiling (needs decisions / live testing — not safe-autonomous)
- **Motion & interaction craft (6→8, +2):** entrance choreography, hover micro-interactions,
  the "thermal pulse" live indicator. Highest remaining *engagement* lever but must be judged
  in-browser interactively, not from stills.
- **Higgsfield assets:** ~8 credits left (free plan). Current generated assets (hero thermal
  texture, studio HDRI) already integrated and good. A bolder hero/section render is possible
  but burns credits — needs Amogh's go-ahead.
- **Mobile density (8→~9.5, ~+1.5):** terminal initial dead-space; hero badge/terminal/panel
  stacking is tight. Small, safe.
- **Bolder art direction:** subjective; risks the restraint philosophy ("if it could appear on
  any SaaS site it's off-brand"). Needs Amogh's taste call.
