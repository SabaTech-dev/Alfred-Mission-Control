import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 mt-1 rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-4 w-24 mb-2 rounded" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-4 w-24 mb-2 rounded" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-4 w-24 mb-2 rounded" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-4 w-24 mb-2 rounded" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-5 w-32 mb-3 rounded" />
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="w-1 h-6 rounded" style={{ backgroundColor: "var(--accent)" }} />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="w-1 h-6 rounded" style={{ backgroundColor: "var(--accent)" }} />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="w-1 h-6 rounded" style={{ backgroundColor: "var(--accent)" }} />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="w-1 h-6 rounded" style={{ backgroundColor: "var(--accent)" }} />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-4 w-28 mb-2 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-4 w-28 mb-2 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-4 w-28 mb-2 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-4 w-28 mb-2 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
