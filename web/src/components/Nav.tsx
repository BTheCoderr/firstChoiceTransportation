import Link from "next/link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy" },
] as const;

export function Nav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="flex gap-6">
      {navItems.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={
            currentPath === href
              ? "font-medium text-slate-900"
              : "text-slate-600 hover:text-slate-900"
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
