import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-4 w-96 mt-2 rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-24 mb-2 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-3 w-20 mt-1 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-24 mb-2 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-3 w-20 mt-1 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-24 mb-2 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-3 w-20 mt-1 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-24 mb-2 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-3 w-20 mt-1 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-24 mb-2 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-3 w-20 mt-1 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-24 mb-2 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-3 w-20 mt-1 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-24 mb-2 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-3 w-20 mt-1 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-24 mb-2 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-3 w-20 mt-1 rounded" />
        </div>
      </div>
    </div>
  );
}
