import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-4 w-96 mt-2 rounded" />
      <div className="flex gap-3 h-[calc(100vh-200px)]">
                  <div className="w-64 flex-shrink-0 rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-9 w-full mb-3 rounded-lg" />
            <div className="py-2 mb-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <Skeleton className="h-4 w-3/4 mb-1 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <div className="py-2 mb-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <Skeleton className="h-4 w-3/4 mb-1 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <div className="py-2 mb-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <Skeleton className="h-4 w-3/4 mb-1 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <div className="py-2 mb-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <Skeleton className="h-4 w-3/4 mb-1 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <div className="py-2 mb-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <Skeleton className="h-4 w-3/4 mb-1 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <div className="py-2 mb-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <Skeleton className="h-4 w-3/4 mb-1 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>
        <div className="flex-1 rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-7 w-48 mb-4 rounded-lg" />
          <Skeleton className="h-4 w-full mb-2 rounded" />
          <Skeleton className="h-4 w-full mb-2 rounded" />
          <Skeleton className="h-4 w-3/4 mb-4 rounded" />
          <Skeleton className="h-5 w-32 mb-3 rounded" />
          <Skeleton className="h-4 w-full mb-2 rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
        </div>
      </div>
    </div>
  );
}
