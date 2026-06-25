"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/architecture", label: "Architecture" },
  { href: "/faq", label: "FAQ" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-ink-500/15 bg-parchment-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pine-700 text-sm font-bold text-parchment-50">
            W
          </span>
          <span className="font-display text-xl font-bold text-ink-900">Waypoint</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 ${
                  active
                    ? "bg-ink-900 text-parchment-50"
                    : "text-ink-700 hover:bg-parchment-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/app"
            className={`whitespace-nowrap rounded-full px-3 py-1.5 ${
              pathname === "/app"
                ? "bg-ink-900 text-parchment-50"
                : "border border-pine-700 text-pine-700 hover:bg-pine-700/10"
            }`}
          >
            Launch App
          </Link>
        </nav>
      </div>
    </header>
  );
}
