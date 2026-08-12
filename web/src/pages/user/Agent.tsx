import { PageHeader } from '../../components/ui/PageHeader'
import AgentApplicationCard from '../../components/agent/AgentApplicationCard'
import AgentLevels from '../../components/agent/AgentLevels'

export default function Agent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Company Agent" subtitle="Apply to become an official agent" />
      <AgentLevels />
      <div id="agent-apply" className="scroll-mt-24">
        <AgentApplicationCard />
      </div>
    </div>
  )
}
