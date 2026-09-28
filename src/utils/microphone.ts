// Plain functions for choosing and opening a microphone. No React in here.
import { BUILT_IN_MIC, NOT_A_HEADSET } from '@constants/regex'

export type MicError = 'denied' | 'no-device' | 'unavailable'

// Echo cancelling and noise suppression: what you want on a call, especially in a café.
const VOICE: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function getMic(deviceId?: string): Promise<MediaStream> {
  const audio = deviceId ? { ...VOICE, deviceId: { exact: deviceId } } : VOICE
  return navigator.mediaDevices.getUserMedia({ audio })
}

/** The first connected headset (AirPods, Jabra, …), or undefined if there's none. */
export async function findHeadset(): Promise<MediaDeviceInfo | undefined> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.find(
    (d) =>
      d.kind === 'audioinput' &&
      // Chrome adds "default" and "communications" entries that duplicate a real device.
      d.deviceId !== 'default' &&
      d.deviceId !== 'communications' &&
      d.label !== '' &&
      !BUILT_IN_MIC.test(d.label) &&
      !NOT_A_HEADSET.test(d.label),
  )
}

/**
 * Opens the best mic: a headset if one is connected, otherwise the system default.
 * We choose ourselves because macOS often keeps the laptop mic as default even with AirPods on.
 */
export async function openBestMic(): Promise<{ stream: MediaStream; headsetId: string | null }> {
  const headset = await findHeadset()
  const stream = await getMic(headset?.deviceId)
  if (headset) return { stream, headsetId: headset.deviceId }

  // Browsers hide device names until the mic is allowed, so on a first visit we couldn't
  // spot the headset above. Now that permission is granted, look once more.
  const lateHeadset = await findHeadset()
  if (!lateHeadset) return { stream, headsetId: null }

  stopStream(stream)
  return { stream: await getMic(lateHeadset.deviceId), headsetId: lateHeadset.deviceId }
}

/** Turns a getUserMedia error into something we can explain to the user. */
export function micErrorFrom(error: unknown): MicError {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-device'
  return 'unavailable' // usually NotReadableError: another app is using the mic
}
