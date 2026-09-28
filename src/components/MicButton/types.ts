import type { Ref } from 'react'

/** What the button is showing: before the call it's 'idle'; during the call, who's active. */
export type MicActivity = 'idle' | 'listening' | 'user' | 'agent' | 'thinking' | 'muted'

export type MicButtonProps = {
  ref?: Ref<HTMLButtonElement>
  label: string
  activity?: MicActivity
  pressed?: boolean // set during a call, where the button toggles mute
  onClick?: () => void
}
