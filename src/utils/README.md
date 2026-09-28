# utils/

Shared, framework-agnostic helper functions (formatting, small calculations, guards,
etc.) used by more than one screen or component. Not React components, not hooks.

One file per concern, named for what it does (e.g. `formatDuration.ts`,
`clamp.ts`), each with its own test file alongside it (`formatDuration.test.ts`)
where the logic is worth testing.
