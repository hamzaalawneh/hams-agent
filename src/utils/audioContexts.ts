// Keeps track of every AudioContext the app opens, so we can tell when phones stop our audio
// (autoplay rules, a phone call, Siri, switching apps) and start it again from a tap.

const START_GRACE_MS = 1000 // a new context takes a moment to start; only then call it stuck

const open = new Map<AudioContext, number>() // context → when it was created
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

/** Use instead of `new AudioContext()`. */
export function createAudioContext(): AudioContext {
  const ctx = new AudioContext()
  open.set(ctx, performance.now())
  ctx.addEventListener('statechange', () => {
    if (ctx.state === 'closed') open.delete(ctx)
    notify()
  })
  setTimeout(notify, START_GRACE_MS) // re-check once the grace period is over
  return ctx
}

/** True when some audio should be playing but the browser is holding it back. */
export function isAudioStuck(): boolean {
  const now = performance.now()
  for (const [ctx, createdAt] of open) {
    // "suspended" by autoplay rules, "interrupted" by iOS (calls, Siri, backgrounding).
    if (ctx.state !== 'running' && now - createdAt > START_GRACE_MS) return true
  }
  return false
}

/** Subscribe to changes (for useSyncExternalStore). */
export function subscribeToAudio(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Must be called from a tap/click: that's what phones require to start audio. */
export function resumeAllAudio(): Promise<unknown> {
  return Promise.all([...open.keys()].map((ctx) => ctx.resume()))
}
