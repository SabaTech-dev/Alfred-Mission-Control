import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
      <div className="space-y-4 w-full max-w-md mx-auto p-8">
        <Skeleton className="h-10 w-10 rounded-xl mx-auto" />
        <Skeleton className="h-8 w-48 rounded-lg mx-auto" />
        <Skeleton className="h-4 w-64 rounded mx-auto" />
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
