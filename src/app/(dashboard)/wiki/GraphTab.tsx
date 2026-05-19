"use client";

import dynamic from "next/dynamic";

const WikiGraphView = dynamic(() => import("@/components/WikiGraphView").then((m) => m.WikiGraphView), { ssr: false });

interface GraphTabProps {
  onNodeClick: (path: string) => void;
}

export function GraphTab({ onNodeClick }: GraphTabProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <WikiGraphView onNodeClick={onNodeClick} />
    </div>
  );
}