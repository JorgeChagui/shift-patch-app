import Link from "next/link";
import { BrandMark } from "@/components/app-shell/brand-mark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <BrandMark />
      <h1 className="text-3xl">Page not found</h1>
      <p className="text-ink-muted">
        There&apos;s no page at this address. It may have moved, or the link may be mistyped.
      </p>
      <Button asChild className="self-start">
        <Link href="/">Go to my shifts</Link>
      </Button>
    </main>
  );
}
