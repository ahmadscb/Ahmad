# SlideSpoken: "Your slides. Now presenting." (40 s YouTube ad)

GOAL:    In 5 s the viewer knows SlideSpoken is an AI agent that *presents* their deck and answers questions, not another slide maker; by 40 s they want to try it at slidespoken.com.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps, H.264 + AAC (silent track; the person adds voice and music).
TIME:    40 s x 30 = 1200 frames. Seven scenes on the brief's clock: 0-4 / 4-9 / 9-16 / 16-22 / 22-28 / 28-34 / 34-40.

LOOK (the brand's own system, SlideSpoken design system tokens):
  ground   canvas #f8f8f6 with a 1 px #d5d8d0 dot grid on a 20 px pitch (product stages); always-dark bands #111611 / #101510 for the room, the live UI and the end card.
  ink      #111311 on light, #f8f8f6 on dark; muted #666a66 / #aeb6ad.
  accent   lime #d8ff73, FILLS ONLY: live tag, Next Slide button, AI mark bars, one highlight per frame, the CTA. Lime text only on dark grounds; olive #5e7d22 for lime-family text on light.
  type     Inter 700, -0.065em tracking, line-height 0.95, display 96-120 px; ONE word per headline in Gelasio italic 400 (Georgia's metric twin) = the brand's serif-em turn.
           DM Mono 500 uppercase +0.13em for eyebrows and labels, 20-24 px.  Body Inter 500 28-34 px.
  medium   the product's own live-presenter UI (journey-* states from ahmadscb/ai-presenter), rebuilt at 1.6-2x so labels stay >= 26 px; two real screenshots
           (live-presenter-hero.jpg, agent-mode-presenting-live.jpg); official logos and meeting icons, unmodified.
  depth    cards: 1 px #dedfdb hairline, radius 24-30 px, shadow 0 22px 70px rgba(17,19,17,.08); no glow, no gradients beyond the brand's own lime-soft Q&A card.

OBJECTS:
  the live UI      dark panel: LIVE tag (lime), "AI Presenter is presenting", Slide n of 8, outline rail 01-05, slide, AI PRESENTER transcript, controls "AI voice ready | Pause | Next Slide ->".
  the AI mark      58 px ink tile, "AI" in lime mono, three lime voice bars that move.
  a room           warm-dark boardroom: wall display with bezel, table plane, six seated silhouettes back-lit from the screen.
  a meeting        the real Agent Mode screenshot: AI Presenter tile + participant tiles.
  people           participant tiles with initials and first names (fictional), the way the product shows them.
  Q&A              status pill "QUESTION DETECTED · PRESENTATION PAUSED", audience bubble, "AI LISTENING" bars, AI bubble, flow strip
                   "Question detected -> AI listening -> Answering -> Resuming presentation ✓" (all real product copy).

MOTION:
  enter   expo.out / power4.out, 0.5-0.8 s; titles per word blur 8px->0 + opacity, 0.07 s apart, no slide-up.
  move    power2.inOut 0.6-0.9 s (camera pull-backs, morphs).
  exit    power3.in, 40-50% of the entrance.
  springs back.out(1.4) only on the cursor press and the CTA.
  overlap next element starts when the previous is ~40% done; landed titles hold dead still.

SHOTS:
  0-4    HOOK. f0: a dark live slide fills the frame. 0.25 s the LIVE tag + AI mark drop in, bars speak, chart bars rise, transcript words appear (the slide presents itself).
         1.3 s camera pulls back (scale 1 -> .58, x right) while the ground floods to canvas; headline "Your slides can present *themselves.*" lands per word left.
         2.6 s an audience bubble "Can you explain this chart?" pops on the UI; "...and answer questions." under the headline. Hand-off: whip left.
  4-9    REVEAL. Wordmark wipes in centred (900 px), settles to the top as the eyebrow "SLIDESPOKEN — YOUR AI PRESENTER" lands.
         5.2 s upload card "Q3 Review.pptx" drops in, progress fills, "ANALYZED"; OR; "Create with AI" card types "New-hire onboarding, week one".
         7.2 s cards morph into the mode choice: In-Person Mode | Agent Mode (Meet, Zoom, Teams icons). Cursor clicks In-Person. Hand-off: zoom through the card.
  9-16   FLOOR. 9-12.4 the boardroom: wall display shows the live UI presenting; label "IN THE ROOM · In-Person Mode"; slow push to the screen.
         12.4 the screen grows past the frame (object becomes the world) into the real Agent Mode screenshot; label "ONLINE · Agent Mode";
         14.4 punch-in on the AI Presenter tile; Meet / Teams / Zoom icons with "SUPPORTED IN AGENT MODE".
  16-22  USE CASES. One live session stage, slide content swaps with a whip: HR onboarding (agenda checks off as the AI speaks),
         then a real estate investor deck (building elevation draws in, plain facts, no returns). Labels as ink pills with a lime dot.
  22-28  MORE. Split screen: SALES DEMOS (product slide, feature callouts) | EDUCATION (lesson diagram draws; a student asks "Why does the leaf need light?").
  28-34  Q&A. Live UI at 1.9x. Status pill drops, slide progress freezes (Paused), audience bubble, AI LISTENING bars, the AI answer types word by word while the Q3 bar lights,
         the flow strip steps to "Resuming presentation ✓" and the outline advances 03 -> 04. Label "LIVE Q&A — BUILT IN".
  34-40  END. Colour flood to #111611; app icon springs in, wordmark wipes in; "Your slides. Now *presenting.*"; lime "Start free ->" pressed by the cursor; "slidespoken.com" held from 36.4 s to the last frame.
  Captions: one line or two, Inter 500 32 px, ink 82% pill, centred at y = 930 (inside 80% title-safe), on through every scene.

BANNED: dark void with floating bits; glow, bloom, particles, orbs; purple/blue gradients; robots, brains; three cards in a row; KPI grids; title over a dimmed screenshot;
        logo docked in a corner; everything fading up at once; titles that drift after landing; invented product buttons; platform logos implying endorsement;
        any figure about results, returns or ROI; the old blue "AI Presenter" logo.

QA: frames 0.0, 1.0, 2.0, 3.5 (hook reads muted); 6.5, 8.5; 10.5, 14.8; 18, 21; 25, 27; 29.5, 31.5, 33.5; 36.5, 39.9 (URL readable). No black frames, nothing under 26 px that must be read.
