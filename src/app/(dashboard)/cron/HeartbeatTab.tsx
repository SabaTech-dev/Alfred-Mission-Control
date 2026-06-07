"use client";

import dynamic from "next/dynamic";

import type { HeartbeatStatus as HeartbeatStatusType } from "@/operations/heartbeat-ops";

type MissionType = import("@/lib/mission-types").Mission;

const HeartbeatStatus = dynamic(
  () => import("@/components/HeartbeatStatus").then((m) => ({ default: m.HeartbeatStatus })),
  { loading: () => <div className="p-6">Cargando Heartbeat...</div>, ssr: false }
);

interface HeartbeatTabProps {
  data: HeartbeatStatusType;
  mission?: MissionType | null;
  onSave: (content: string, agentId?: string) => Promise<void>;
}

export function HeartbeatTab({ data, mission, onSave }: HeartbeatTabProps) {
  return <HeartbeatStatus data={{ ...data, mission }} onSave={onSave} onSaveMission={() => {}} />;
}
