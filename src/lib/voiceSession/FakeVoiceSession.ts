import { SPEECH_LEVEL } from '@constants/audio'
import type { Lang } from '@lib/i18n/context'
import { readLevel } from '@utils/audio'
import { AGENT_LINES, type AgentLine } from './script'
import type { AgentState, Caption, CallState, Metrics, VoiceSession } from './types'

const CONNECT_MS = 800 // pretend handshake
const TICK_MS = 50 // how often we listen for the user and move the captions along
const END_OF_TURN_MS = 1000 // this much silence means the user has finished
const REPLY_AFTER_MS = 3000 // the agent answers 3 s after the user's last word
const RECONNECT_MS = 4000 // how long a simulated drop lasts before we're back
const BARGE_IN_MS = 300 // talking over the agent this long pauses it
const NEW_STRETCH_MS = 250 // a gap longer than this starts a new stretch of voice

/** The demo switch from the brief: degrade the network on purpose. Not part of the contract. */
export type NetworkCondition = 'good' | 'poor'

/** The contract, plus two demo controls only the fake has. */
export type FakeVoiceSession = VoiceSession & {
  setNetwork(condition: NetworkCondition): void
  dropConnection(): void
}

type Events = {
  state: CallState
  agentState: AgentState
  agentAudio: MediaStreamTrack
  transcript: Caption
  metrics: Metrics
}

/** Everything audio, created when the call connects. */
type AudioGraph = {
  ctx: AudioContext
  micAnalyser: AnalyserNode
  micSource: MediaStreamAudioSourceNode | null
  output: MediaStreamAudioDestinationNode // the agent's voice, sent to the app as a track
}

/** The line the agent is saying (or paused in the middle of). */
type Speech = {
  line: AgentLine
  clip: AudioBuffer
  words: string[]
  startedAt: number // AudioContext time the clip would have started at if never paused
  pausedAt: number // seconds into the clip where the user interrupted
  shown: number // words already sent as a caption
}

/**
 * Plays the "server" side of a call: listens to the real mic, notices when the user
 * stops talking, thinks for a moment, then answers with a recorded line and captions.
 * If the user talks over the agent, it pauses, and carries on once they've finished.
 * It never stops the mic tracks. The mic belongs to the caller (useMicrophone).
 */
export function createFakeVoiceSession(lang: Lang): FakeVoiceSession {
  const lines = AGENT_LINES[lang]
  const listeners: { [E in keyof Events]: Set<(value: Events[E]) => void> } = {
    state: new Set(),
    agentState: new Set(),
    agentAudio: new Set(),
    transcript: new Set(),
    metrics: new Set(),
  }
  const timers = new Set<number>()
  const micSamples = new Float32Array(512)

  let audio: AudioGraph | null = null
  let playing: AudioBufferSourceNode | null = null
  let speech: Speech | null = null

  let callState: CallState = 'connecting'
  let agentState: AgentState = 'listening'
  let network: NetworkCondition = 'good'
  let muted = false
  let userTalking = false
  let voiceStartedAt = 0
  let lastVoiceAt = 0
  let nextLine = 0
  let ended = false

  // ---- Events and timers ----

  function emit<E extends keyof Events>(event: E, value: Events[E]) {
    listeners[event].forEach((callback) => callback(value))
  }

  function setCallState(state: CallState) {
    callState = state
    emit('state', state)
  }

  function setAgentState(state: AgentState) {
    agentState = state
    emit('agentState', state)
  }

  function after(ms: number, callback: () => void) {
    const id = window.setTimeout(() => {
      timers.delete(id)
      callback()
    }, ms)
    timers.add(id)
  }

  function every(ms: number, callback: () => void) {
    timers.add(window.setInterval(callback, ms))
  }

  // ---- Listening ----

  function attachMic(mic: MediaStream) {
    if (!audio) return
    audio.micSource?.disconnect()
    audio.micSource = audio.ctx.createMediaStreamSource(mic)
    audio.micSource.connect(audio.micAnalyser)
  }

  function listenForUser() {
    if (!audio || agentState === 'thinking' || muted) return

    // While the agent talks, the mic may also pick up its voice from the speakers.
    // Echo cancellation removes most of it; a higher bar ignores what's left.
    const agentTalking = agentState === 'speaking'
    const threshold = agentTalking ? SPEECH_LEVEL * 2 : SPEECH_LEVEL
    const now = performance.now()

    if (readLevel(audio.micAnalyser, micSamples) > threshold) {
      if (!userTalking || now - lastVoiceAt > NEW_STRETCH_MS) voiceStartedAt = now
      userTalking = true
      lastVoiceAt = now
      // The user talks over the agent: pause it (barge-in).
      if (agentTalking && now - voiceStartedAt > BARGE_IN_MS) pauseSpeech()
      return
    }

    // The user has finished their turn.
    if (userTalking && now - lastVoiceAt > END_OF_TURN_MS) {
      userTalking = false
      if (agentTalking) return // just a noise over the agent, not a real interruption
      if (speech) {
        play(speech.pausedAt) // we were interrupted: carry on from where we stopped
      } else {
        setAgentState('thinking')
        after(REPLY_AFTER_MS - END_OF_TURN_MS, () => void speak())
      }
    }
  }

  /** Shows as many words as the audio has reached (a partial caption). */
  function revealCaption() {
    if (!audio || !speech || !playing) return // paused: the caption waits too
    const progress = (audio.ctx.currentTime - speech.startedAt) / speech.clip.duration
    const count = Math.min(speech.words.length, Math.floor(progress * speech.words.length) + 1)
    if (count <= speech.shown) return

    speech.shown = count
    const text = speech.words.slice(0, count).join(' ')
    emit('transcript', { speaker: 'agent', text, final: false })
  }

  // ---- Speaking ----

  /** Starts the next line of the script. */
  async function speak() {
    if (!audio) return
    const line = lines[nextLine++ % lines.length]
    const clip = await loadClip(audio.ctx, line.audio)
    if (ended) return

    speech = { line, clip, words: line.text.split(' '), startedAt: 0, pausedAt: 0, shown: 0 }
    play(0)
  }

  /** Plays the current line from `offset` seconds in. */
  function play(offset: number) {
    if (!audio || !speech) return
    const current = speech

    const source = audio.ctx.createBufferSource()
    source.buffer = current.clip
    source.connect(audio.output)
    source.onended = () => {
      // Stopped by a pause or a hang-up rather than reaching the end: nothing to finish.
      if (ended || playing !== source) return
      playing = null
      speech = null
      emit('transcript', { speaker: 'agent', text: current.line.text, final: true })
      setAgentState('listening')
    }
    source.start(0, offset)

    playing = source
    current.startedAt = audio.ctx.currentTime - offset
    setAgentState('speaking')
  }

  /** The user interrupted: stop the audio but remember where we were. */
  function pauseSpeech() {
    if (!audio || !speech || !playing) return
    speech.pausedAt = audio.ctx.currentTime - speech.startedAt
    const source = playing
    playing = null // set first, so onended knows this isn't the natural end
    source.stop()
    setAgentState('listening')
  }

  // ---- The contract ----

  async function connect({ mic }: { agentId: string; mic: MediaStream }) {
    setCallState('connecting')
    const ctx = new AudioContext()
    const micAnalyser = ctx.createAnalyser()
    micAnalyser.fftSize = micSamples.length
    audio = { ctx, micAnalyser, micSource: null, output: ctx.createMediaStreamDestination() }
    attachMic(mic)

    await new Promise<void>((resolve) => after(CONNECT_MS, resolve))
    if (ended) return

    emit('agentAudio', audio.output.stream.getAudioTracks()[0])
    setCallState('connected')
    every(TICK_MS, () => {
      if (callState !== 'connected') return
      listenForUser()
      revealCaption()
    })
    every(1000, () => {
      if (callState === 'connected') emit('metrics', sampleMetrics(network))
    })
    void speak() // the agent greets first
  }

  function hangUp() {
    if (ended) return
    ended = true
    // clearTimeout also clears intervals: browsers share one id pool for both.
    timers.forEach((id) => clearTimeout(id))
    playing?.stop()
    if (audio) {
      audio.micSource?.disconnect()
      audio.output.stream.getTracks().forEach((track) => track.stop())
      void audio.ctx.close()
    }
    setCallState('ended')
  }

  function on<E extends keyof Events>(event: E, callback: (value: Events[E]) => void) {
    listeners[event].add(callback)
    return () => {
      listeners[event].delete(callback)
    }
  }

  // ---- Demo controls ----

  /**
   * Simulates the connection dropping, then coming back on its own.
   * Suspending the AudioContext freezes the agent mid-word; resuming carries on from the
   * same spot. Captions follow the audio clock, so they freeze and resume with it.
   */
  function dropConnection() {
    if (callState !== 'connected') return
    setCallState('reconnecting')
    void audio?.ctx.suspend()
    after(RECONNECT_MS, () => {
      void audio?.ctx.resume()
      setCallState('connected')
    })
  }

  return {
    connect,
    replaceMic: async (mic) => attachMic(mic),
    setMuted: (value) => {
      muted = value
    },
    hangUp,
    on,
    setNetwork: (condition) => {
      network = condition
    },
    dropConnection,
  }
}

async function loadClip(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const response = await fetch(url)
  return ctx.decodeAudioData(await response.arrayBuffer())
}

function between(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min))
}

/** packetLoss is a percentage (4 = 4%): the contract doesn't say, so this is our assumption. */
function sampleMetrics(network: NetworkCondition): Metrics {
  // Even a good network has the odd bad second; the UI must not overreact to it.
  const blip = network === 'good' && Math.random() < 0.1
  if (network === 'poor' || blip) {
    return { rttMs: between(350, 650), packetLoss: between(4, 12), jitterMs: between(40, 90) }
  }
  return { rttMs: between(60, 110), packetLoss: between(0, 1), jitterMs: between(4, 12) }
}
