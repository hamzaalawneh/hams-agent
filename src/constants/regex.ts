// Every regular expression in the app lives here.

// --- Microphone names ---

// Built-in laptop mics: "MacBook Pro Microphone (Built-in)", Windows "Microphone Array (Realtek…)".
export const BUILT_IN_MIC = /built-in|internal|macbook|microphone array|smart sound/i

// Mics that aren't headsets: virtual devices from apps, and a nearby iPhone (Continuity).
export const NOT_A_HEADSET = /virtual|zoom|teams|blackhole|loopback|soundflower|krisp|iphone|ipad/i

// --- Browser user agents ---

export const IOS_UA = /iPhone|iPad|iPod/
export const MAC_UA = /Macintosh/ // iPadOS also reports this, see detectBrowser()
export const ANDROID_UA = /Android/
export const FIREFOX_UA = /Firefox\//
export const CHROMIUM_UA = /Chrome\/|Chromium\/|Edg\// // Chrome, Edge, Brave, Arc…
export const SAFARI_UA = /Safari\// // check last: Chromium browsers also say "Safari"
