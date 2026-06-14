"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const PluginsPanel = dynamic(() => import("@/components/PluginsPanel"), {
  loading: () => (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      Loading plugins...
    </div>
  ),
});

export default function PluginsPage() {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading...</div>}>
        <PluginsPanel />
      </Suspense>
    </div>
  );
}
