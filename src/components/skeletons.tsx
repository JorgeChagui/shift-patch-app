import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder rows while a list streams in. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}

/** Placeholder for a table while it streams in. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 rounded-lg border bg-surface p-4" aria-hidden>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

/** Title-and-content placeholder for a whole page (loading.tsx). */
export function PageSkeleton({ table = false }: { table?: boolean }) {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading">
      <Skeleton className="h-9 w-48" />
      {table ? <TableSkeleton /> : <ListSkeleton />}
    </div>
  );
}
