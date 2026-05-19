import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-4 w-96 mt-2 rounded" />
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="p-4">
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 flex-1 rounded" />
          </div>
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 flex-1 rounded" />
          </div>
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 flex-1 rounded" />
          </div>
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 flex-1 rounded" />
          </div>
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 flex-1 rounded" />
          </div>
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 flex-1 rounded" />
          </div>
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 flex-1 rounded" />
          </div>
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 flex-1 rounded" />
          </div>
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 flex-1 rounded" />
          </div>
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 flex-1 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
