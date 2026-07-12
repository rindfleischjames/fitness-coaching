"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/schedule", label: "Schedule" },
  { href: "/progress", label: "Progress" },
  { href: "/messages", label: "Messages" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
              <span className="nav-dot" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
