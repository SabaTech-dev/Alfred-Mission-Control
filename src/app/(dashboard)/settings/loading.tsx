import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-4 w-96 mt-2 rounded" />
              <div className="flex gap-2 mb-4">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
        <div className="flex items-center gap-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
        <div className="flex items-center gap-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
        <div className="flex items-center gap-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
        <div className="flex items-center gap-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
        <div className="flex items-center gap-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
      </div>
    </div>
  );
}
