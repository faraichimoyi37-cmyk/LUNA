import AppShell from './AppShell'
import { adminNav } from '../../config/navigation'

export default function AdminLayout() {
  return <AppShell nav={adminNav} role="ADMIN" />
}
