import Link from "next/link";
import { cn } from "@/lib/utils";

/** The ShiftPatch wordmark: a patch of a 24h strip, and the name. */
export function BrandMark({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-bold text-brand-ink", className)}>
      <span aria-hidden className="relative block h-3 w-7 overflow-hidden rounded-full bg-brand/20">
        <span className="absolute inset-y-0 left-[30%] w-[45%] bg-brand" />
        <span className="absolute inset-y-0 left-[75%] w-[15%] bg-mint" />
      </span>
      ShiftPatch
    </Link>
  );
}
