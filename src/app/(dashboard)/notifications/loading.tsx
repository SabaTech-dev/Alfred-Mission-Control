import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-4 w-96 mt-2 rounded" />
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-1 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-24 mt-2 rounded" />
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-1 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-24 mt-2 rounded" />
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-1 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-24 mt-2 rounded" />
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-1 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-24 mt-2 rounded" />
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-1 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-24 mt-2 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
