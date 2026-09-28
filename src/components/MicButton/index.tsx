import './styles.css'
import type { MicButtonProps } from './types'

// Before a call: starts it. During a call: toggles mute, and doubles as the visualiser.
// The halo size comes from --user-level / --agent-level, written by useAudioLevel.
export function MicButton({ ref, label, activity = 'idle', pressed, onClick }: MicButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      className="mic-button"
      data-activity={activity}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <span className="mic-button__icon" aria-hidden="true" />
    </button>
  )
}
