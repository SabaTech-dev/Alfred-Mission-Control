import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-4 w-96 mt-2 rounded" />
              <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-4 w-24 mb-2 rounded" />
            <Skeleton className="h-7 w-16 rounded" />
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-4 w-24 mb-2 rounded" />
            <Skeleton className="h-7 w-16 rounded" />
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-4 w-24 mb-2 rounded" />
            <Skeleton className="h-7 w-16 rounded" />
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-4 w-24 mb-2 rounded" />
            <Skeleton className="h-7 w-16 rounded" />
          </div>
        </div>
              <div className="flex gap-2 mb-4">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      <div className="space-y-3">
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="w-0.5 flex-1 rounded" style={{ backgroundColor: "var(--border)" }} />
          </div>
          <div className="flex-1 rounded-xl p-4 mb-2" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4 mb-2 rounded" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="w-0.5 flex-1 rounded" style={{ backgroundColor: "var(--border)" }} />
          </div>
          <div className="flex-1 rounded-xl p-4 mb-2" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4 mb-2 rounded" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="w-0.5 flex-1 rounded" style={{ backgroundColor: "var(--border)" }} />
          </div>
          <div className="flex-1 rounded-xl p-4 mb-2" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4 mb-2 rounded" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="w-0.5 flex-1 rounded" style={{ backgroundColor: "var(--border)" }} />
          </div>
          <div className="flex-1 rounded-xl p-4 mb-2" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4 mb-2 rounded" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
