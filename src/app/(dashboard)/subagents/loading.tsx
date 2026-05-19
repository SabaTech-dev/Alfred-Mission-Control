import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-4 w-96 mt-2 rounded" />
      <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-6 w-6 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="ml-6 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-6 w-6 rounded-lg" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="ml-6 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-6 w-6 rounded-lg" />
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
