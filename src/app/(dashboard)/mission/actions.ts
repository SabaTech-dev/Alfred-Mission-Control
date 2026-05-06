"use server";

import { saveMission, deleteMission } from "@/lib/mission-storage";
import type { Mission } from "@/lib/mission-types";
import { revalidatePath } from "next/cache";

export async function saveMissionAction(mission: Mission) {
  saveMission(mission);
  revalidatePath("/mission");
}

export async function resetMissionAction() {
  deleteMission();
  revalidatePath("/mission");
}
