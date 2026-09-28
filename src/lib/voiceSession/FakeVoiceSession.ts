import { SPEECH_LEVEL } from '@constants/audio'
import type { Lang } from '@lib/i18n/LanguageProvider'
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

type Events = {
  state: CallState
  agentState: AgentState
  agentAudio: MediaStreamTrack
  transcript: Caption
  metrics: Metrics
}

/** The line the agent is saying (or paused in the middle of), so captions can follow the audio. */
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
export class FakeVoiceSession implements VoiceSession {
  private lines: AgentLine[]
  private listeners: { [E in keyof Events]: Set<(value: Events[E]) => void> } = {
    state: new Set(),
    agentState: new Set(),
    agentAudio: new Set(),
    transcript: new Set(),
    metrics: new Set(),
  }

  private ctx: AudioContext | null = null
  private micSource: MediaStreamAudioSourceNode | null = null
  private micAnalyser: AnalyserNode | null = null
  private micSamples = new Float32Array(512)
  private agentOutput: MediaStreamAudioDestinationNode | null = null
  private playing: AudioBufferSourceNode | null = null
  private speech: Speech | null = null
  private timers = new Set<number>()

  private callState: CallState = 'connecting'
  private agentState: AgentState = 'listening'
  private network: NetworkCondition = 'good'
  private muted = false
  private userTalking = false
  private voiceStartedAt = 0
  private lastVoiceAt = 0
  private nextLine = 0
  private ended = false

  constructor(lang: Lang) {
    this.lines = AGENT_LINES[lang]
  }

  // ---- The contract ----

  async connect({ mic }: { agentId: string; mic: MediaStream }): Promise<void> {
    this.setCallState('connecting')

    this.ctx = new AudioContext()
    this.micAnalyser = this.ctx.createAnalyser()
    this.micAnalyser.fftSize = this.micSamples.length
    this.agentOutput = this.ctx.createMediaStreamDestination()
    this.attachMic(mic)

    await new Promise<void>((resolve) => this.after(CONNECT_MS, resolve))
    if (this.ended) return

    this.emit('agentAudio', this.agentOutput.stream.getAudioTracks()[0])
    this.setCallState('connected')
    this.every(TICK_MS, () => this.tick())
    this.every(1000, () => {
      if (this.callState === 'connected') this.emit('metrics', sampleMetrics(this.network))
    })
    void this.speak() // the agent greets first
  }

  async replaceMic(mic: MediaStream): Promise<void> {
    this.attachMic(mic)
  }

  setMuted(muted: boolean): void {
    this.muted = muted
  }

  hangUp(): void {
    if (this.ended) return
    this.ended = true

    // clearTimeout also clears intervals: browsers share one id pool for both.
    this.timers.forEach((id) => clearTimeout(id))
    this.playing?.stop()
    this.micSource?.disconnect()
    this.agentOutput?.stream.getTracks().forEach((track) => track.stop())
    void this.ctx?.close()

    this.setCallState('ended')
  }

  on<E extends keyof Events>(event: E, callback: (value: Events[E]) => void): () => void {
    this.listeners[event].add(callback)
    return () => this.listeners[event].delete(callback)
  }

  // ---- Demo controls (not part of the contract) ----

  setNetwork(condition: NetworkCondition): void {
    this.network = condition
  }

  /**
   * Simulates the connection dropping, then coming back on its own.
   * Suspending the AudioContext freezes the agent mid-word; resuming carries on from the
   * same spot. Captions follow the audio clock, so they freeze and resume with it.
   */
  dropConnection(): void {
    if (this.callState !== 'connected') return
    this.setCallState('reconnecting')
    void this.ctx?.suspend()
    this.after(RECONNECT_MS, () => {
      void this.ctx?.resume()
      this.setCallState('connected')
    })
  }

  // ---- Every tick ----

  private tick() {
    if (this.callState !== 'connected') return
    this.listenForUser()
    this.revealCaption()
  }

  private attachMic(mic: MediaStream) {
    if (!this.ctx || !this.micAnalyser) return
    this.micSource?.disconnect()
    this.micSource = this.ctx.createMediaStreamSource(mic)
    this.micSource.connect(this.micAnalyser)
  }

  private listenForUser() {
    if (this.agentState === 'thinking' || this.muted || !this.micAnalyser) return

    // While the agent talks, the mic may also pick up its voice from the speakers.
    // Echo cancellation removes most of it; a higher bar ignores what's left.
    const agentTalking = this.agentState === 'speaking'
    const threshold = agentTalking ? SPEECH_LEVEL * 2 : SPEECH_LEVEL
    const now = performance.now()

    if (readLevel(this.micAnalyser, this.micSamples) > threshold) {
      if (!this.userTalking || now - this.lastVoiceAt > NEW_STRETCH_MS) this.voiceStartedAt = now
      this.userTalking = true
      this.lastVoiceAt = now
      // The user talks over the agent: pause it (barge-in).
      if (agentTalking && now - this.voiceStartedAt > BARGE_IN_MS) this.pauseSpeech()
      return
    }

    // The user has finished their turn.
    if (this.userTalking && now - this.lastVoiceAt > END_OF_TURN_MS) {
      this.userTalking = false
      if (agentTalking) return // just a noise over the agent, not a real interruption
      if (this.speech) {
        this.resumeSpeech() // we were interrupted: carry on from where we stopped
      } else {
        this.setAgentState('thinking')
        this.after(REPLY_AFTER_MS - END_OF_TURN_MS, () => void this.speak())
      }
    }
  }

  /** Shows as many words as the audio has reached (a partial caption). */
  private revealCaption() {
    if (!this.speech || !this.playing || !this.ctx) return // paused: the caption waits too
    const { words, startedAt } = this.speech
    const progress = (this.ctx.currentTime - startedAt) / this.speech.clip.duration
    const count = Math.min(words.length, Math.floor(progress * words.length) + 1)
    if (count <= this.speech.shown) return

    this.speech.shown = count
    this.emit('transcript', {
      speaker: 'agent',
      text: words.slice(0, count).join(' '),
      final: false,
    })
  }

  // ---- Speaking ----

  /** Starts the next line of the script. */
  private async speak() {
    if (!this.ctx) return
    const line = this.lines[this.nextLine++ % this.lines.length]
    const clip = await this.load(line.audio)
    if (this.ended) return

    this.speech = { line, clip, words: line.text.split(' '), startedAt: 0, pausedAt: 0, shown: 0 }
    this.play(0)
  }

  /** Plays the current line from `offset` seconds in. */
  private play(offset: number) {
    if (!this.ctx || !this.agentOutput || !this.speech) return
    const speech = this.speech

    const source = this.ctx.createBufferSource()
    source.buffer = speech.clip
    source.connect(this.agentOutput)
    source.onended = () => {
      // Stopped by a pause or a hang-up rather than reaching the end: nothing to finish.
      if (this.ended || this.playing !== source) return
      this.playing = null
      this.speech = null
      this.emit('transcript', { speaker: 'agent', text: speech.line.text, final: true })
      this.setAgentState('listening')
    }
    source.start(0, offset)

    this.playing = source
    speech.startedAt = this.ctx.currentTime - offset
    this.setAgentState('speaking')
  }

  /** The user interrupted: stop the audio but remember where we were. */
  private pauseSpeech() {
    if (!this.ctx || !this.speech || !this.playing) return
    this.speech.pausedAt = this.ctx.currentTime - this.speech.startedAt
    const source = this.playing
    this.playing = null // set first, so onended knows this isn't the natural end
    source.stop()
    this.setAgentState('listening')
  }

  private resumeSpeech() {
    if (this.speech) this.play(this.speech.pausedAt)
  }

  private async load(url: string): Promise<AudioBuffer> {
    const response = await fetch(url)
    return this.ctx!.decodeAudioData(await response.arrayBuffer())
  }

  // ---- Small helpers ----

  private setCallState(state: CallState) {
    this.callState = state
    this.emit('state', state)
  }

  private setAgentState(state: AgentState) {
    this.agentState = state
    this.emit('agentState', state)
  }

  private emit<E extends keyof Events>(event: E, value: Events[E]) {
    this.listeners[event].forEach((callback) => callback(value))
  }

  private after(ms: number, callback: () => void) {
    const id = window.setTimeout(() => {
      this.timers.delete(id)
      callback()
    }, ms)
    this.timers.add(id)
  }

  private every(ms: number, callback: () => void) {
    this.timers.add(window.setInterval(callback, ms))
  }
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
