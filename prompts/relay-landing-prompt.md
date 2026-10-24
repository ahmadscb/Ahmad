# Relay landing page: build prompt

Paste everything below the line into Claude (Claude Code or claude.ai). It describes the page exactly
as built, including every colour, font, section, line of copy, and the light-stream algorithm.
For a pixel-identical copy, also send the original file `relay/index.html` and say
"use this file as the reference".

---

## Skills and setup

Load these before you start, if your environment has them:

1. **frontend-design** (Anthropic Agent Skills, `example-skills:frontend-design`). Install with
   `/plugin marketplace add anthropics/skills`, then `/plugin install example-skills@anthropic-agent-skills`.
2. **webapp-testing** (same plugin, `example-skills:webapp-testing`). Use it at the end to check the page
   at 1440px and 390px wide with Playwright, and confirm there are no console errors and no sideways scroll on phones.
3. **Ponytail** (optional, `DietrichGebert/ponytail`). It keeps the build to one file with no libraries.
4. On claude.ai, publish the result as an HTML Artifact so it can be opened on a phone.

## Task

Build a single-page marketing site for **Relay**, a workflow-automation product, as one self-contained
`index.html`. Use plain HTML, CSS and vanilla JS, with no frameworks and no libraries. The only external
resource is Google Fonts. Draw the light stream with Canvas 2D. Desktop and phone (390px) must both work,
with no horizontal scroll.

## Look

- A single dark look; don't build a light theme. Set `color-scheme: dark`.
- Tokens:
  ```
  --bg #050605; --panel rgba(255,255,255,.035); --line rgba(255,255,255,.08)
  --fg #edefea; --muted #8b9087; --faint #5a5e55
  --lime #c6f432; --lime-ink #0b0f02; --teal #4fa3c7
  --r 18px (card radius)
  ```
- Fonts from Google Fonts: **Geist** 400/500/600 for headlines and body, **Geist Mono** 400/500 for
  labels, and **Instrument Serif** italic for accent words. Include fallback stacks.
- Headlines: weight 600, letter-spacing -0.035em, line-height 1.02, `text-wrap: balance`.
  h1 is `clamp(44px, 6.4vw, 84px)`, h2 is `clamp(32px, 4.4vw, 56px)`.
- **Signature rule:** each headline has one word or phrase in an `<em>` set in Instrument Serif italic
  at weight 400.
- Labels: Geist Mono 11px, muted colour. An "eyebrow" is a pill with a 1px `--line` border, a 6px lime
  dot with a lime glow, and lowercase mono text.
- Glass panels (`.glass`): `linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.02))`,
  1px `--line` border, 18px radius, `backdrop-filter: blur(18px) saturate(120%)`,
  `inset 0 1px 0 rgba(255,255,255,.06)` plus `0 30px 60px -30px rgba(0,0,0,.8)`.
- Buttons: 40px-tall pills. The lime button has black text and a lime glow on hover. The ghost button
  is `rgba(255,255,255,.05)` with a 1px line border.
- A fixed radial vignette sits over the canvas:
  `radial-gradient(120% 80% at 50% 50%, transparent 40%, rgba(5,6,5,.75) 100%)`.
- Layout: a centred column 1160px wide with a 20px side gutter (use `max(20px, env(safe-area-inset-*))`).
  Sections have 120px vertical padding, 80px below 900px wide.
- Logo mark: a 24px lime rounded square (7px radius) holding a black double-chevron icon. Define the
  icon once as an SVG symbol with path `M5 5l6 7-6 7M12 5l6 7-6 7`, stroke 2.6, round caps and joins.
- Section header pattern (`.head`): a two-column grid, 1.2fr and 1fr, aligned to the bottom. Left
  column: eyebrow, then h2. Right column: a muted paragraph, max 44ch, pushed to the right.
  It becomes one column below 900px.

## Motion

1. **Preloader.** A full-screen `--bg` overlay. A 120px SVG ring (radius 54, 3px stroke, faint track,
   lime arc) fills while a mono counter shows 0–100%, over 1100ms with ease-out cubic. Then the ring
   moves and scales onto the nav logo mark (FLIP, 0.7s, `cubic-bezier(.7,0,.2,1)`), the overlay fades
   out, and it is removed.
2. **Light stream.** A fixed full-screen `<canvas>` behind all content. It is the signature effect, so
   build it exactly like this:
   ```js
   // Keyframes of one cubic bezier [start, c1, c2, end] in viewport fractions, spread over scroll progress 0→1
   const KF = [
     [[1.15,-.1],[.55,.25],[.4,.85],[.95,1.2]],
     [[-.15,.15],[.65,-.05],[.3,1.05],[1.15,.85]],
     [[1.15,.15],[.15,.35],[.95,.85],[-.15,1.05]],
     [[-.15,.95],[.4,.55],[.7,1.15],[1.15,.7]]
   ];
   // progress eases toward scrollY / (scrollHeight - innerHeight): prog += (target - prog) * .06 each frame
   // shape(p): pick the keyframe pair, smoothstep between them
   // N = 120 strands (60 below 700px wide); for strand i: o = i/N - .5, w = sin(t*.0004 + i*.15) * .015
   //   start = [P0x*W + o*160,          P0y*H + o*90]
   //   c1    = [(P1x + o*.7 + w)*W,     (P1y + o*.35)*H]
   //   c2    = [(P2x - o*.55 - w)*W,    (P2y + o*.45)*H]
   //   end   = [P3x*W + o*120,          P3y*H + o*320]
   // Draw with globalCompositeOperation 'lighter'. edge = |o|*2.
   //   Every 3rd strand with edge > .7 is teal: rgba(79,163,199, .12 - edge*.06)
   //   Every other strand is lime: rgb(lerp(220,150,edge), lerp(250,220,edge), lerp(120,40,edge)), alpha .16 - edge*.11
   //   Line width 1.6 on every 11th strand, otherwise .8
   // Glow: the centre strand again, stroke rgba(198,244,50,.03), lineWidth 140
   // Particles: N/2 dots, each riding a random strand at t += .0006..0021 per frame,
   //   1.6px squares in rgba(230,255,170,.8)
   // Cap devicePixelRatio at 1.5. Skip drawing while document.hidden. Under reduced motion, draw one frame only.
   ```
3. **Section reveals.** Any `.rv` element that starts below the fold gets `.pre`:
   `filter: blur(12px); opacity: .25; transform: translateY(26px) scale(.985)`. When it enters the view
   (IntersectionObserver, threshold .15) remove `.pre`; the transition runs 1s with
   `cubic-bezier(.2,.7,.2,1)`. On entry, also start that block's count-ups (1400ms, ease-out cubic,
   en-US thousands separators), meter fills and bar growth.
4. **Hero window tilt.** Parent perspective is 1400px. Use
   `rotateX(12*f + my*6deg) rotateY(-14*f + mx*8deg)` with `f = max(0, 1 - scrollY/500)`. mx and my are
   the pointer position from the centre, from -0.5 to 0.5.
5. **Logo plate.** A 220vh zone with a sticky 100vh stage. The lime plate (16:9, `min(880px, 92vw)`,
   radius 36px, glow `0 0 120px rgba(198,244,50,.25)`) scales from 0.06 to 1 over the first 35% of
   the zone's scroll, holds, then folds back to 0.06 over the last 30%, with smoothstep easing. Its
   radius goes from 160px to 36px, and its content fades in only above 60% open.
6. Everything respects `prefers-reduced-motion`: no loader, a static stream, no pinning, no blur.

## Page, top to bottom (use this copy exactly)

**Nav.** Sticky, 14px from the top. A glass pill bar 58px tall containing: the logo mark and "Relay";
links Product, How it works, Customers, Pricing; a mono pill "● all systems normal"; a lime
"Start free" button. Below 900px only the logo and the button remain.

**Hero.** Two columns, 1fr and 1.05fr.
- Left:
  - eyebrow "open beta / 240 apps connected"
  - h1 "The handoffs run *themselves.*"
  - paragraph "Relay runs the steps between your apps and only pings a person when it matters."
  - buttons "Start free" (lime) and "▸ Watch a build, 2 minutes" (ghost)
  - mono line "free for 14 days / no card / no call with sales"
- Right: the tilting glass window.
  - Top bar: mono "Refunds over 5000 · 3 steps / 1 branch" and a lime "● running".
  - An SVG flow, viewBox 520×270. Nodes are #111310 rounded rects with 10px radius:
    - "Refund created" with sub "stripe" at (14,110), 104×50
    - "Amount over 5000" with sub "condition" at (186,70), 148×50, lime 45% border
    - "Ask finance" with sub "waiting on a yes" at (392,35)
    - "Log to warehouse" with sub "postgres" at (392,175)
  - Connectors are curves. The true branch has a lime gradient; the else branch is dashed white 15%.
    Small mono labels read "true" and "else".
  - Two 4px lime dots ride the connectors using SVG `animateMotion` (1.4s loop, the second starting 0.7s later).
  - Below the flow, a run log of 4 mono rows: time, event and a lime status. A new row is prepended
    every 1.8s with a blur-in, cycling through these four events:
    - "refund re_8K2 · €6,240 → over 5000"
    - "refund re_8K3 · €410 → logged"
    - "approval finance · Dana → yes"
    - "refund re_8K4 · €1,980 → logged"

**Apps strip.** Mono "connects to 240 apps, and to whatever you use". Then 8 glass tiles, 52px each,
showing two letters (SL, ST, PO, HU, NO, LI, GI, SH) with the app name below: slack, stripe, postgres,
hubspot, notion, linear, github, sheets. One tile at a time turns solid lime with a glow, moving to the
next every 0.9s.

**Glue** (id "how"). Eyebrow "connected service". h2 "Most of a process is *glue.*" Right paragraph:
"Copy this into that. Check it went through. Ask Dana if it is fine. Relay takes the glue and leaves you
the decisions." Then three feature rows (1fr text, 1.35fr glass card), separated by 1px lines:
1. Label "one canvas", title "One canvas, every branch", text "Drop a trigger, add a condition, split
   the path. You see what ran, how long it took and which branch it picked." Card: mono
   "run 41092 · 412 ms", then a trace with rows read refund 141 ms (bar 0–34%), check amount 9 ms
   (34–38%), branch: over 5000 4 ms (38–40%), and ask finance 258 ms (40–100%, 45% opacity). The bars
   grow from the left in sequence. Axis: 0 / 100 / 200 / 300 / 400 ms.
2. Label "approvals", title "Approvals where people already are", text "Send a step to Slack, get a yes
   or a no, keep moving. Nobody learns another dashboard." Card: "#finance · today", a Slack-style
   message from Relay (lime avatar with the chevrons) at 10:42: "Refund of **€6,240** for **Northwind
   GmbH** is over the 5,000 limit. Approve it?" Below it, buttons Approve and Hold, which write
   "✓ Approved by you. Refund sent to Stripe." or "⏸ On hold. Relay will ask again tomorrow at 09:00."
3. Label "run history", title "Every run is on the record", text "Inputs, outputs and timings for 90
   days. Replay any run before you trust it with money." Card: "runs per weekday · 32,880 average" and
   six isometric bars. Each bar has a two-tone side (#2a2d27 / #1a1c18) and a diamond top (#3a3e35).
   Heights are mon 31, tue 36, wed 34, thu 39, fri 33, sat 44, multiplied by 3.2px. The last bar is lime.

**Logo plate** (see Motion). Mono "what we are actually selling", h2 "The best workflow is the one
nobody mentions in *standup.*", and a 46px black mark with lime chevrons.

**Reliability.** Eyebrow "reliability". h2 "*Boring* in the ways that matter." Right paragraph:
"Credentials, retries, rate limits, residency. The parts nobody demos, and the parts that decide the
year." Two glass cards:
- "One runtime, every app": "Relay holds the credentials, retries and rate limits, so a step behaves
  the same on Stripe or on the API you wrote last week." Below is a hub diagram: a 64px glowing lime
  centre tile, with dashed lime lines to six round nodes (SL slack, ST stripe, PG postgres, HS hubspot,
  NO notion, GH github).
- "Runs where your data lives": "Pick Frankfurt, Virginia or Mumbai. Payloads and logs stay in the
  region you chose, and the audit trail says so in writing." Meters: eu-central-1 Frankfurt 46%,
  us-east-1 Virginia 36%, ap-south-1 Mumbai 18%. Each meter is a 4px track with a lime fill ending in a
  white knob, and fills on reveal.

**Tuesday.** Eyebrow "daily view". h2 "A *Tuesday,* seen from Relay." Right paragraph: "The screen people
actually keep open: what ran, what is queued, and who still owes an answer." A bento grid with 3
columns (1.6fr 1fr 1fr), 2 columns on tablet and 1 on phone:
- **Wide card:** "this week: runs by hour", with a pill "● next run in 12 min". Below it, a heatmap of
  hours 09 / 11 / 13 / 15 / 17 against mon–sun, with cells in lime at varying opacity. The weekend is
  dim, and Tuesday at 13 is solid lime.
- **Ring card:** "steps with no person", an SVG ring (radius 46, 7px stroke) that sweeps to 80%, a
  count-up to "80%", and "finish without waiting on anyone".
- **Waiting card:** "waiting on people", avatars DA, MS, OB and TE in pastel colours, a count-up to 3,
  and "longest wait: 26 min, in #finance".
- **Failures card:** "failures and recoveries", a lime sparkline with a faint area fill and an endpoint
  dot, and "14 retried · 14 recovered · 0 lost".
- **Regions card:** "where it ran", "3 regions", and "every run stays in the region that started it".

**Numbers** (id "customers"). Eyebrow "case studies". h2 "Numbers we did *not* have to explain away."
Right paragraph: "Counted across every account, including the ones that churned. An honest average, not
a best case." Three stat cards with 52px count-ups:
- runs, **51,112**, with a rising sparkline and "on an average weekday"
- time back, **8**, with 16 small lime bars (the second half dim) and "hours a week given back per person"
- first attempt, **57%**, with a meter and "of new flows finish on the first try"

Then three quote cards:
- "We killed four scripts nobody wanted to own and a spreadsheet that had been lying to us." (Marta
  Silvani, Head of operations, Fieldkit)
- "Finance stopped asking me for the weekly export. It just lands in the channel now." (Owen Brandt,
  Data lead, Cartwell)
- "What sold my team was the log. When something breaks we see the exact payload." (Tomi Ekelund,
  Staff engineer, Nordline)

**Pricing** (id "pricing"). Eyebrow "pricing". h2 "You pay for runs, *not for seats.*" Right paragraph:
"Invite the whole company. Nobody waits for permission to automate their own work."
- **Estimator card:** label "How many runs do you expect a month?" and a range slider from 0 to 100.
  The slider's track is lime up to the thumb, and the thumb is a 20px lime circle with a glow ring.
  Scale labels read 1,000 / 30,000 / 300,000.
- **Slider maths:** runs = `1000 * 300^(v/100)`, rounded to 500. The plan is Starter $29 up to 3,000
  runs, Team $89 up to 30,000, and Scale $290 above that.
- **Estimator display:** on the right, the plan name, the price at 46px with "a month", and
  "N runs a month". The slider starts at 30,000 (Team).
- **Plan cards:** the recommended plan's card gets a lime border and glow. The three cards are:
  - starter, $29 a month: 3,000 runs a month, 10 workflows, 7 days of run history, Email support.
    Ghost button "Start free".
  - team, badge "most picked", $89: 30,000 runs a month, Unlimited workflows, 90 days of run history,
    Slack approvals and code steps. Lime button "Start free".
  - scale, $290: 300,000 runs a month, Single sign-on and audit log, 1 year of run history, Named
    engineer, 4 hour response. Ghost button "Talk to us".
- List items use a lime ✓.

**Final CTA** (id "start"). Two columns, 1fr and 1.3fr:
- A glass card with the logo, "Automation for the work that lives between your tools." and mono
  "stay in touch · changelog every friday".
- A solid lime card containing:
  - mono "what now"
  - h2 "Pick the task you *hate* most."
  - "Bring one job nobody enjoys doing by hand. If Relay cannot run it by the end of the trial, we will
    tell you so."
  - an email form in a pill: a "Work email" input and a black button with lime text, "Start free"
  - On submit, `preventDefault`. A valid email shows "This is a demo page, so nothing was sent."; an
    invalid one shows "Enter a work email like name@company.com."

**Footer.** A top border. Columns: "Relay Labs" with mono "independent, profitable, since 2024"; product
(Canvas, Approvals, Run history, Changelog); company (About, Customers, Careers, Security); help (Docs,
Status, Contact, Privacy).

## Responsive and quality

- Below 900px every two- and three-column grid becomes one column, feature visuals sit under their text,
  and the bento grid has 2 columns. Below 520px the bento grid has 1 column.
- Give every grid child `min-width: 0` so nothing overflows on phones.
- Visible lime focus rings, semantic headings, `aria-live` on the log result text, the decision text and
  the price output, and a label for the email field.
- Check at 1440px and 390px with no console errors and `scrollWidth <= innerWidth` on the phone.
