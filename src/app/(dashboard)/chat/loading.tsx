import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <div className="flex flex-col h-[calc(100vh-200px)]">
        <div className="flex-1 space-y-3 overflow-hidden">
          <div className="flex gap-3 max-w-[80%]">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="rounded-xl p-3 flex-1" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <Skeleton className="h-4 w-full mb-1 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          </div>
          <div className="flex gap-3 max-w-[80%]">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="rounded-xl p-3 flex-1" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <Skeleton className="h-4 w-full mb-1 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          </div>
          <div className="flex gap-3 max-w-[80%]">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="rounded-xl p-3 flex-1" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <Skeleton className="h-4 w-full mb-1 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          </div>
          <div className="flex gap-3 max-w-[80%]">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="rounded-xl p-3 flex-1" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <Skeleton className="h-4 w-full mb-1 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
