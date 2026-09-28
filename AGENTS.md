# AGENTS.md

Ground rules for working on this project (Hams.AI take-home: the in-browser test-call screen).

## What this is

A React + TypeScript web app for a fake in-browser "test call" with a voice agent
(mic in, fake agent audio + captions out). No real backend, no real AI — the agent
is a scripted fake built against a fixed `VoiceSession` interface.

## Ground rules

- **Depth over breadth.** Prefer a smaller set of things done well over everything
  done halfway. If scope is cut, say so (in the README's decision log), don't just drop it silently.
- **Keep the code simple. Do not overengineer.** No abstractions, config layers,
  or generic frameworks for problems this app doesn't have. Prefer the plain,
  obvious solution over a flexible one. Add structure only when a second real
  use case shows up, not in anticipation of one.
- **Real audio only where it matters.** The microphone must be a real `getUserMedia`
  stream. The agent's voice and network conditions are simulated.
- **Clean up after every call.** No leaked `MediaStreamTrack`s, `AudioContext`s, or
  `requestAnimationFrame` loops — on hang-up, unmount, or the panel closing mid-call.
- **Mobile web is first-class**, not an afterthought: iOS Safari and Android Chrome
  autoplay/gesture rules, backgrounding, small screens, safe areas.
- **Arabic-first.** Full English/Arabic UI, RTL layout, and correct rendering of
  mixed Arabic/English captions. Don't bolt RTL on at the end.
- **Accessibility and theming are design constraints**, not polish — design tokens,
  runtime theme switching (brand / white-label / dark), and screen-reader-friendly
  state changes from the start.
- **Design for people who can't see the screen, and people who can't hear well.**
  Every state change communicated by sound or animation needs a visible and/or
  text equivalent (captions, not just audio; a visible label, not just a color
  or icon change). Every control needs a real accessible name for screen
  readers, correct focus order, and a minimum 44px touch target. Never make
  sound the only channel, and never make sight the only channel.
- **Structure:** each screen lives in its own folder under `src/screens/<Screen>/`
  with `index.tsx`, `styles.css`, and `types.ts`.
- **Components:** any reusable component goes under `src/components/<Component>/`,
  with the same `index.tsx` / `styles.css` / `types.ts` split as screens. Don't
  build one-off components inline inside a screen if it's reusable — give it its
  own folder there instead.
- **Utils:** shared, framework-agnostic helper functions (formatting, guards, small
  calculations — not components, not hooks) go in `src/utils/`, one file per
  concern. Don't duplicate a helper inside a screen or component if it belongs here.
- **Images and icons go in `src/assets/`**, as real `.svg`/`.png` files, referenced
  via the `@assets` alias — never inlined as JSX/SVG markup inside a component.
  An icon that should follow the current theme colour is applied as a CSS
  `mask-image: url('@assets/name.svg')` on a `currentColor`-background element
  (see `Logo` and `MicButton`), not pasted into the component as raw `<svg>`.
- **Explain every line.** Whatever is written here (by a human or an AI assistant)
  needs to be understood well enough to explain and change live.
- **Commit as you go.** Small, real commits that show how the work evolved — no
  squashing history.

## Stack

- React + TypeScript, Vite
- Path aliases in `vite.config.ts` + `tsconfig.app.json`: `@lib`, `@screens`,
  `@components`, `@utils`, `@translations`, `@assets` — all resolve to the
  matching `src/` folder. Use them instead of `../../` relative imports.
- No routing/state library assumed yet — keep dependencies minimal unless a real
  need shows up.
- Package manager is **Yarn** (yarn.lock is the source of truth — don't add
  package-lock.json back).
- Linting is `oxlint` (Rust-based, fast) via `yarn lint` — no ESLint.
  Formatting is Prettier (`yarn format` / `format:check`), set to run on
  save via `.vscode/settings.json` (needs the Prettier extension,
  recommended in `.vscode/extensions.json`).

## Non-goals

Real WebRTC backend, real speech/AI model, pixel-perfect branding.
