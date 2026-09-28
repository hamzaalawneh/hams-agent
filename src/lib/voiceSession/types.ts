// The session contract from the brief. The UI only talks to this interface,
// so a real WebRTC session could replace FakeVoiceSession without UI changes.

export type CallState = 'connecting' | 'connected' | 'reconnecting' | 'ended'
export type AgentState = 'listening' | 'thinking' | 'speaking'
export type Caption = { speaker: 'user' | 'agent'; text: string; final: boolean }
export type Metrics = { rttMs: number; packetLoss: number; jitterMs: number }

export interface VoiceSession {
  connect(opts: { agentId: string; mic: MediaStream }): Promise<void>
  replaceMic(mic: MediaStream): Promise<void> // device switched mid-call
  setMuted(muted: boolean): void
  hangUp(): void

  on(e: 'state', cb: (s: CallState) => void): () => void
  on(e: 'agentState', cb: (s: AgentState) => void): () => void
  on(e: 'agentAudio', cb: (track: MediaStreamTrack) => void): () => void
  on(e: 'transcript', cb: (c: Caption) => void): () => void // partials, then a final
  on(e: 'metrics', cb: (m: Metrics) => void): () => void // about once per second
}
