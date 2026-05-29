import { SettingsClient } from './SettingsClient';

// Settings loads its data client-side so the session cookie is sent natively
// by the browser (server components would need explicit cookie forwarding).
export default function SettingsPage() {
  return <SettingsClient />;
}
