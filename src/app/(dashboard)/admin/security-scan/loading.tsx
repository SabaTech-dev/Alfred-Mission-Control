import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-4 w-96 mt-2 rounded" />
      <div className="flex justify-end mb-3">
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="w-1 self-stretch rounded">
            <Skeleton className="w-1 h-12 rounded" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
            <Skeleton className="h-4 w-full mb-1 rounded" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="w-1 self-stretch rounded">
            <Skeleton className="w-1 h-12 rounded" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
            <Skeleton className="h-4 w-full mb-1 rounded" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="w-1 self-stretch rounded">
            <Skeleton className="w-1 h-12 rounded" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
            <Skeleton className="h-4 w-full mb-1 rounded" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="w-1 self-stretch rounded">
            <Skeleton className="w-1 h-12 rounded" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
            <Skeleton className="h-4 w-full mb-1 rounded" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
