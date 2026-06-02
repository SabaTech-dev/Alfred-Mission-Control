import { getOpenClawCronJobs } from "@/operations/openclaw-cron-ops";
import { getSystemCronJobs } from "@/operations/system-cron-ops";
import { getHeartbeatStatus } from "@/operations/heartbeat-ops";
import { getMission } from "@/lib/mission-storage";

import { CronClient } from "./CronClient";

export const dynamic = "force-dynamic";

export default async function CronPage() {
  const [openclawJobs, systemJobs, heartbeat, mission] = await Promise.all([
    getOpenClawCronJobs(),
    getSystemCronJobs(),
    getHeartbeatStatus(),
    Promise.resolve(getMission()),
  ]);
  
  return (
    <CronClient
      initialData={{
        openclawJobs,
        systemJobs,
        heartbeat,
        mission,
      }}
    />
  );
}
