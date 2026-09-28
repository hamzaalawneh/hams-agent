import './styles.css'
import type { HangUpButtonProps } from './types'

// The universal "end call" button: red circle, phone handset turned down.
export function HangUpButton({ label, onClick }: HangUpButtonProps) {
  return (
    <button
      type="button"
      className="hang-up-button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <span className="hang-up-button__icon" aria-hidden="true" />
    </button>
  )
}
