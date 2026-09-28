import './styles.css'
import type { LogoProps } from './types'

export function Logo({ label = 'Hams.AI' }: LogoProps) {
  return <span className="logo" role="img" aria-label={label} />
}
