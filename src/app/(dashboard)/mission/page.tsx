import { getMission } from "@/lib/mission-storage";
import MissionPageClient from "./MissionPageClient";

export const dynamic = "force-dynamic";

export default async function MissionPage() {
  const mission = getMission();
  return <MissionPageClient initialMission={mission} />;
}
