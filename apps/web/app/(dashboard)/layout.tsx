"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/monitors", label: "Monitors" },
  { href: "/incidents", label: "Incidents" },
  { href: "/status-pages", label: "Status Pages" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 md:w-56 md:min-h-screen p-4 space-y-6">
        <div className="flex items-center justify-between md:block">
          <span className="text-lg font-semibold">OpenMonitor</span>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm ${
                pathname?.startsWith(item.href)
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm ${
                pathname?.startsWith("/admin")
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="hidden md:block space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500">{user.email}</div>
          <ThemeToggle />
          <button onClick={() => logout()} className="text-sm text-down hover:underline">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
