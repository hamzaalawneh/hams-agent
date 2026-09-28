import { ANDROID_UA, CHROMIUM_UA, FIREFOX_UA, IOS_UA, MAC_UA, SAFARI_UA } from '@constants/regex'

export type Browser = 'ios' | 'android' | 'safari' | 'firefox' | 'chrome' | 'other'

// Only used to pick which "unblock your microphone" steps to show.
export function detectBrowser(): Browser {
  const ua = navigator.userAgent
  // iPadOS pretends to be a Mac; touch support gives it away.
  if (IOS_UA.test(ua) || (MAC_UA.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (ANDROID_UA.test(ua)) return 'android'
  if (FIREFOX_UA.test(ua)) return 'firefox'
  if (CHROMIUM_UA.test(ua)) return 'chrome'
  if (SAFARI_UA.test(ua)) return 'safari'
  return 'other'
}
