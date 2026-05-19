import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="w-full h-screen flex items-center justify-center" style={{ backgroundColor: "#0C0C0C" }}>
      <div className="text-center">
        <Skeleton className="h-12 w-12 rounded-xl mx-auto mb-4" />
        <Skeleton className="h-5 w-32 rounded mx-auto mb-2" />
        <Skeleton className="h-3 w-48 rounded mx-auto" />
      </div>
    </div>
  );
}
