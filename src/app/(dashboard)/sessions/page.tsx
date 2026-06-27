export const dynamic = "force-dynamic";

import { Timer, Users } from "lucide-react";

export default function SessionsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Timer className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-sm text-zinc-400">Active and recent agent sessions</p>
        </div>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <Users className="mx-auto mb-3 h-12 w-12 text-zinc-600" />
        <p className="text-zinc-400">Session management coming soon.</p>
        <p className="mt-1 text-xs text-zinc-500">
          View live transcripts, steer conversations, and manage agent sessions.
        </p>
      </div>
    </div>
  );
}
