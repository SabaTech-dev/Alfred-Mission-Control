import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-4 w-96 mt-2 rounded" />
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
          <Skeleton className="h-6 w-24 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
          <Skeleton className="h-6 w-24 rounded" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
          <Skeleton className="h-6 w-24 rounded" />
        </div>
      </div>
      <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <Skeleton className="h-5 w-48 mb-4 rounded" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      </div>
              <div className="grid grid-cols-3 gap-3">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-5 w-32 mb-4 rounded" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-5 w-32 mb-4 rounded" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
