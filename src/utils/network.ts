import type { Metrics } from '@lib/voiceSession/types'

export type NetworkQuality = 'good' | 'fair' | 'poor'

// Rough limits for a voice call. Past "poor", people start talking over each other
// (delay) or hear choppy audio (loss, jitter). packetLoss is a percentage.
const POOR = { rttMs: 400, packetLoss: 5, jitterMs: 50 }
const FAIR = { rttMs: 200, packetLoss: 2, jitterMs: 30 }

/** Rates one second of metrics by its worst number. */
export function rateNetwork({ rttMs, packetLoss, jitterMs }: Metrics): NetworkQuality {
  if (rttMs > POOR.rttMs || packetLoss > POOR.packetLoss || jitterMs > POOR.jitterMs) return 'poor'
  if (rttMs > FAIR.rttMs || packetLoss > FAIR.packetLoss || jitterMs > FAIR.jitterMs) return 'fair'
  return 'good'
}
