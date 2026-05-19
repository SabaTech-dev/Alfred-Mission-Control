"use client";

import { BookOpen } from "lucide-react";

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
      <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
