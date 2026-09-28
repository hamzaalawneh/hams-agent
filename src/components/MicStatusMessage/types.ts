import type { MicStatus } from '@hooks/useMicrophone'

export type MicStatusMessageProps = {
  status: MicStatus
  deviceLabel?: string
  onRetry: () => void
}
