import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 mt-1 rounded" />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="rounded-xl p-4 flex-1" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-20 mb-1 rounded" />
          <Skeleton className="h-6 w-10 rounded" />
        </div>
        <div className="rounded-xl p-4 flex-1" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-20 mb-1 rounded" />
          <Skeleton className="h-6 w-10 rounded" />
        </div>
        <div className="rounded-xl p-4 flex-1" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-20 mb-1 rounded" />
          <Skeleton className="h-6 w-10 rounded" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full ml-auto" />
          </div>
          <Skeleton className="h-4 w-full mb-2 rounded" />
          <Skeleton className="h-4 w-3/4 mb-3 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full ml-auto" />
          </div>
          <Skeleton className="h-4 w-full mb-2 rounded" />
          <Skeleton className="h-4 w-3/4 mb-3 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full ml-auto" />
          </div>
          <Skeleton className="h-4 w-full mb-2 rounded" />
          <Skeleton className="h-4 w-3/4 mb-3 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full ml-auto" />
          </div>
          <Skeleton className="h-4 w-full mb-2 rounded" />
          <Skeleton className="h-4 w-3/4 mb-3 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
