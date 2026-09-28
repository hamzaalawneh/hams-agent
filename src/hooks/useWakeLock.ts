import { useEffect } from 'react'

/**
 * Keeps the screen on while `active`, so the phone doesn't auto-lock mid-call.
 * Supported on Android Chrome and iOS 16.4+; elsewhere this quietly does nothing.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return

    let lock: WakeLockSentinel | null = null
    let stopped = false

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (stopped) void lock.release() // the call ended while we were waiting
      } catch {
        // refused (e.g. battery saver): the call still works, the screen may just dim
      }
    }

    // Browsers drop the lock whenever the page is hidden; take it again on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}
