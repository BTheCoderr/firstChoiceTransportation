import Link from "next/link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy" },
] as const;

export function Nav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {navItems.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={
            "inline-flex min-h-11 items-center rounded-md px-2 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 " + (currentPath === href
              ? "font-medium text-slate-900"
              : "text-slate-600 hover:text-slate-900")
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
