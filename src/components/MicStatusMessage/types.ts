import type { MicStatus } from '@hooks/useMicrophone'

export type MicStatusMessageProps = {
  status: MicStatus
  deviceLabel: string | null
  onRetry: () => void
}
