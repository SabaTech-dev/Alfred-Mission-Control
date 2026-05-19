import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-4 w-96 mt-2 rounded" />
      <div className="space-y-3">
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-5 w-48 mb-2 rounded" />
          <Skeleton className="h-3 w-24 mb-3 rounded" />
          <Skeleton className="h-4 w-full mb-1 rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-5 w-48 mb-2 rounded" />
          <Skeleton className="h-3 w-24 mb-3 rounded" />
          <Skeleton className="h-4 w-full mb-1 rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-5 w-48 mb-2 rounded" />
          <Skeleton className="h-3 w-24 mb-3 rounded" />
          <Skeleton className="h-4 w-full mb-1 rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-5 w-48 mb-2 rounded" />
          <Skeleton className="h-3 w-24 mb-3 rounded" />
          <Skeleton className="h-4 w-full mb-1 rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-5 w-48 mb-2 rounded" />
          <Skeleton className="h-3 w-24 mb-3 rounded" />
          <Skeleton className="h-4 w-full mb-1 rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
      </div>
    </div>
  );
}
