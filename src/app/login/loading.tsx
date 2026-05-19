import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
      <div className="w-full max-w-sm space-y-6 p-8 rounded-2xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="text-center">
          <Skeleton className="h-10 w-10 rounded-xl mx-auto mb-3" />
          <Skeleton className="h-6 w-40 rounded-lg mx-auto mb-2" />
          <Skeleton className="h-4 w-56 rounded mx-auto" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-3 w-48 mx-auto rounded" />
      </div>
    </div>
  );
}
