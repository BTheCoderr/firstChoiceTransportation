import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold">First Choice Transportation</Link>
          <Nav currentPath="" />
        </div>
      </header>
      <section className="mx-auto max-w-3xl space-y-5 px-6 py-20">
        <h1 className="text-4xl font-bold">Page not found</h1>
        <p className="text-slate-600">This page has moved or the link is invalid. Your driver and payroll records have not been changed.</p>
        <div className="flex flex-wrap gap-4">
          <Link className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white" href="/">Return home</Link>
          <Link className="rounded-lg border border-blue-700 px-5 py-3 text-blue-700" href="/support">Get help</Link>
        </div>
      </section>
    </main>
  );
}
