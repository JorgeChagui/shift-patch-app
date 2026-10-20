"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** An item is current on its own path and below it, except a role's home ("/admin") on its sub-pages. */
function isCurrent(pathname: string, href: string, items: NavItem[]): boolean {
  if (pathname === href) return true;
  const deeper = items.some((item) => item.href !== href && item.href.startsWith(href));
  return !deeper && pathname.startsWith(`${href}/`);
}

/** Role navigation. Scrolls sideways on narrow screens rather than collapsing into a menu. */
export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1">
        {items.map((item) => {
          const current = isCurrent(pathname, item.href, items);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-1.5 whitespace-nowrap text-ink-muted hover:bg-brand-wash hover:text-brand-ink",
                  current && "bg-brand-wash font-bold text-brand-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
