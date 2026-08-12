import AppShell from './AppShell'
import { userNav } from '../../config/navigation'

export default function UserLayout() {
  return <AppShell nav={userNav} role="USER" />
}
