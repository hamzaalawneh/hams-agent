import type { NetworkCondition } from '@lib/voiceSession/FakeVoiceSession'

export type NetworkSimulatorProps = {
  network: NetworkCondition
  canDrop: boolean // false while already reconnecting
  onNetworkChange: (condition: NetworkCondition) => void
  onDrop: () => void
}
