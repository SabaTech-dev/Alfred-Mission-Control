import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-4 w-96 mt-2 rounded" />
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div>
            <Skeleton className="h-5 w-32 mb-1 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div>
            <Skeleton className="h-5 w-32 mb-1 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div>
            <Skeleton className="h-5 w-32 mb-1 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div>
            <Skeleton className="h-5 w-32 mb-1 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div>
            <Skeleton className="h-5 w-32 mb-1 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
