import './styles.css'
import type { MicButtonProps } from './types'

export function MicButton({ label, onClick }: MicButtonProps) {
  // The label carries the meaning for screen readers; the icon is pure
  // decoration (a CSS mask, not an <svg> in the DOM), so there's nothing
  // here for assistive tech to read twice or get out of sync with.
  return (
    <button type="button" className="mic-button" aria-label={label} onClick={onClick}>
      <span className="mic-button__icon" aria-hidden="true" />
    </button>
  )
}
