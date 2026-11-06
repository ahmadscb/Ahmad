# ChartQuest — agent notes

Gamified market-structure charting prototype. Self-contained project: do not touch other apps,
services, Nginx or VPS config. Never add live trading/brokerage functionality.

- Stack: Next.js 16 (App Router) + React 19 + TypeScript, Lightweight Charts 5 (candles), PixiJS 8 (FX).
- Game-dev skills (PixiJS, shaders, game feel, UI/UX, performance, audio…) are installed
  project-scoped in `.claude/skills/` from gamedev-skills/awesome-gamedev-agent-skills (see SOURCE_COMMIT).
  Load `pixijs-rendering` before touching `src/game/`.
- `src/core/` is framework-free (types, indicators, detectors, sample data, CSV). Every detector
  must stay causal — `tests/causality.test.ts` enforces it. Run `npm test` after changing rules.
- `src/game/` positions everything from (candle index, price) through `ChartMapper` each frame.
  Never store screen coordinates across frames.
- Verify: `npm run typecheck && npm test && npm run build`, then with the server on 127.0.0.1:3100
  run `npm run e2e` (sync error must be < 0.5 px, no console errors).
- Dev/prod servers bind to 127.0.0.1:3100 only. Don't expose ports without approval.
