import { runEarningsEngine } from '../services/engine'
import { getSettings } from '../services/settings'

let running = false

export function startCronJobs() {
  const tick = async () => {
    if (running) return
    running = true
    try {
      const settings = await getSettings()
      if (!settings.earningsEngineEnabled) return
      const settled = await runEarningsEngine()
      if (settled > 0) console.log(`[luna-engine] matured ${settled} investment(s)`)
    } catch (error) {
      console.error('[luna-engine]', error)
    } finally {
      running = false
    }
  }
  tick()
  setInterval(tick, 60_000)
}
