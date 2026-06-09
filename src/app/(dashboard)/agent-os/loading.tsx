import { Loader2 } from "lucide-react";

export default function AgentOSLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: "var(--accent)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading Agent OS Command Center...</p>
      </div>
    </div>
  );
}
