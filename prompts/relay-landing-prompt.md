# Relay-style landing page — reconstructed prompt

Reverse-engineered from a screen recording of the GetLayers "Relay" preview. This is an
equivalent prompt written from what the page shows, not GetLayers' paid prompt. Copy and brand
names are placeholders; replace them with your own.

---

Build a single-page marketing site for **Relay**, a workflow-automation product, as one
self-contained `index.html` (inline CSS/JS; Three.js and GSAP + ScrollTrigger from a CDN are allowed).

## Concept
Black and lime. One continuous stream of light runs the whole length of the page and every
section sits on top of it. Calm, technical, premium: an ops tool that is "boring in the ways that matter".

## Design system
- Background `#050605`, panels `rgba(255,255,255,0.03)` with a `1px rgba(255,255,255,0.07)` border,
  16–20px radius, `backdrop-filter: blur(16px)`, and a faint inner top highlight.
- Accent lime `#C6F432` (buttons, active bars, plates); secondary glow teal-blue `#4FA3C7` used only inside the light stream.
- Text `#EDEFEA`, muted `#8A8F86`, faint `#55594F`.
- Type: a neutral grotesk (Inter / Geist) for headlines, 600 weight, tight tracking (-0.03em).
  **Every headline has one word or phrase set in an italic serif** (Instrument Serif italic), e.g.
  "The handoffs run *themselves.*", "Most of a process is *glue.*", "*Boring* in the ways that matter."
- Monospace (Geist Mono / JetBrains Mono) at 11px for all labels, eyebrows, stats units and the nav
  status pill. Eyebrows are small pills: a lime dot plus lowercase mono text ("● reliability").
- Buttons: lime pill with black text ("Start free"); ghost pill with a ▸ icon ("Watch a build, 2 minutes").

## The light stream (signature effect)
A fixed full-viewport WebGL canvas behind all content: 150–250 thin additive-blended curves
(lime core, teal-blue fringe, sparse glowing particles) forming one flowing ribbon. Scroll progress
drives the ribbon's control points, so it sweeps from the right edge in the hero, crosses behind the
middle sections, and curls along the bottom near pricing. Add slow idle motion and a subtle bloom.
Respect `prefers-reduced-motion` with a static gradient fallback.

## Motion
- **Preloader:** a lime ring counts 0→100% in mono, then shrinks and flies into the nav logo (FLIP).
- **Section reveals:** every block enters from `filter: blur(12px); opacity: 0; translateY(24px)` and
  settles into focus (0.9s, ease-out, staggered children). "Arrives out of focus and settles."
- **Hero window:** a glass panel in 3D perspective that tilts toward the cursor and flattens as you
  scroll. Inside, a live flow animates: node "Refund created (stripe)" → condition "Amount over 5000"
  → branches "Ask finance (waiting on a yes)" and "Log to warehouse (postgres)", with a dot travelling
  the connector, a "running" status, and a run log ticking underneath (time, event, ms).
- **Logo plate:** mid-page, a lime rounded plate grows out of the logo mark, holds the line
  "The best workflow is the one nobody mentions in *standup.*", then folds back into the mark.
- Count-up numbers, bars that fill, and a ring that sweeps when they enter the view.

## Sections (in order)
1. **Nav** (glass, sticky): logo mark (lime » chevrons) + "Relay"; links Product, How it works,
   Customers, Pricing; mono status pill "● all systems normal"; lime "Start free".
2. **Hero:** eyebrow "open beta / 240 apps connected"; H1 "The handoffs run *themselves.*";
   sub "Relay runs the steps between your apps and only pings a person when it matters."; both buttons;
   mono note "free for 14 days / no card / no call with sales"; tilting flow window on the right.
3. **Integrations strip:** mono "connects to 240 apps, and to whatever you use"; a row of app tiles
   (slack, stripe, postgres, hubspot, notion) that light up in sequence.
4. **"Most of a process is *glue.*"** with a short paragraph, then three feature rows, each a text
   column plus a glass visual:
   - "One canvas, every branch": run trace with timing bars on an ms axis.
   - "Approvals where people already are": a Slack-style approval card. Send a step to Slack, get a yes or a no.
   - "Every run is on the record": an isometric 3D bar chart of runs per weekday, the last bar lime.
5. **Logo plate moment** (see Motion).
6. **"*Boring* in the ways that matter."** Two cards:
   - "One runtime, every app": hub diagram with the lime mark in the centre.
   - "Runs where your data lives": region bars eu-central-1 46%, us-east-1 36%, ap-south 18%.
7. **"A *Tuesday,* seen from Relay."** A bento dashboard: a weekly run heatmap, "next run in 12 min",
   an 80% ring ("of steps finish without a person"), a waiting-on-people avatar stack, a failures sparkline, a region map.
8. **"Numbers we did *not* have to explain away."** Three count-up stats (51,112 runs, 8 hours given
   back per person, 57% fixed first attempt) with mini charts, then three short customer quotes with name and role.
9. **Pricing: "You pay for runs, *not for seats.*"** A slider "How many runs do you expect a month?"
   (1k–300k) recommends a plan live ($89/month at 30,000). Three tiers: Starter $29, Team $89 (badge
   "most picked", lime button), Scale $290 ("Talk to us"), each with a check list.
10. **Final CTA:** a lime card "Pick the task you *hate* most." with an email field and "Start free",
    beside a dark card "Automation for the work that lives between your tools."
11. **Footer:** Relay Labs, link columns, mono "since 2024".

## Quality bar
Responsive down to 375px (stack columns; the hero window goes below the copy). Semantic HTML,
visible focus states, AA contrast on all text, 60fps (pause the canvas when the tab is hidden), no layout shift.
