# Answers

## Part 2 · Think

### 2.1 Review this pull request

<details>
<summary>The code under review</summary>

```ts
import { useEffect, useState } from 'react'

export function useMicLevel(deviceId?: string) {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    let raf: number
    navigator.mediaDevices.getUserMedia({ audio: { deviceId } }).then((stream) => {
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      ctx.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b) / data.length
        setLevel(avg / 255)
        raf = requestAnimationFrame(tick)
      }
      tick()
    })

    return () => cancelAnimationFrame(raf)
  }, [])

  return level
}
```

</details>

#### 1. The review comments I'd post

I went through this code with AI support and found several issues. Here's how I'd comment on each one, most important first.

**Cleanup on unmount** (`return () => cancelAnimationFrame(raf)`)

> The mic stays live after unmount, and the browser's recording indicator stays on. The cleanup should stop everything we started, like this:
>
> ```ts
> return () => {
>   cancelled = true
>   cancelAnimationFrame(raf)
>   stream?.getTracks().forEach((t) => t.stop())
>   ctx?.close()
> }
> ```

**Missing dependency** (`}, [])`)

> `deviceId` is used inside the effect but it's not in the deps, so switching the mic does nothing. It should be `[deviceId]`. The linter (`react-hooks/exhaustive-deps`) should flag this too.

**No error handling** (`getUserMedia(...).then(...)`)

> There's no `.catch` here. If the user denies the permission or there's no mic, it fails silently and the meter just shows 0. Please catch it, and ideally return the error so the UI can tell the user what happened.

**setState on every frame** (`setLevel(avg / 255)`)

> This calls `setLevel` on every frame, so the component re-renders about 60 times a second. Rounding the value lets React skip renders when nothing changed. If that's still too much, keep it in a ref.

#### 2. The version I'd merge

```ts
import { useEffect, useState } from 'react'

export function useMicLevel(deviceId?: string) {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    let cancelled = false
    let raf = 0
    let stream: MediaStream | undefined
    let ctx: AudioContext | undefined

    const start = async () => {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      })
      if (cancelled) return stream.getTracks().forEach((t) => t.stop())

      ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      ctx.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.fftSize)

      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (const v of data) sum += ((v - 128) / 128) ** 2
        setLevel(Math.round(Math.sqrt(sum / data.length) * 100) / 100)
        raf = requestAnimationFrame(tick)
      }
      tick()
    }

    start().catch((err) => console.error('useMicLevel:', err))

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      ctx?.close()
    }
  }, [deviceId])

  return level
}
```

#### 3. Helping my teammate get more out of AI

First, I'd talk with him about best practices and show him through practice, not just in comments. On top of that, I'd enforce our coding standards in `AGENTS.md` / `CLAUDE.md` rule files, so whatever the AI writes already matches our standards before it reaches review.

### 2.2 What AI should never own

AI should never have access to credentials. It should also be guided strictly by the systems the project already uses. For example, if the project has a design system, the AI should have access to it, so it knows in cases like whether a `useCallback` is needed or not. That's one of the simplest examples.

## Part 3 · Imagine

### 3.2 The sound of thinking

I've already added an experience in the app where when the user talks the agent always listens and it writes listening for the user

### 3.2 Your corner of the web

I built a website called [LoLive](https://www.lolive.gg/), a League of Legends site connected to Riot's APIs. It does live analytics for players while they play against each other, using AI analysis.
