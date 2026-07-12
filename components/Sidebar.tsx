"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const items = [
  { href: "/coach", label: "Roster" },
  { href: "/coach/calendar", label: "My Calendar" },
  { href: "/coach/messages", label: "Messages" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <span className="brand-mark">VITALS</span>
      <nav className="sidebar-nav">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/coach" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button className="btn btn-plain" style={{ marginTop: "auto" }} onClick={signOut}>
        Sign out
      </button>
    </aside>
  );
}
