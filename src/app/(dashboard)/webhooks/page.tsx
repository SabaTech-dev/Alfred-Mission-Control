"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const WebhooksPanel = dynamic(() => import("@/components/WebhooksPanel"), {
  loading: () => (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      Loading webhooks...
    </div>
  ),
});

export default function WebhooksPage() {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Suspense
        fallback={
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        }
      >
        <WebhooksPanel />
      </Suspense>
    </div>
  );
}
