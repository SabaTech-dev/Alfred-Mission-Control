import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Telemetry loads client-side via /api/telemetry/dashboard polling
  // SSR is now fast — no blocking execFileSync calls
  return <DashboardClient initialTelemetry={null} />;
}
