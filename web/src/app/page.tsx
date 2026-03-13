import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="text-xl font-semibold text-slate-800">
            First Choice Transportation
          </span>
          <Nav currentPath="/" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <section className="mb-16">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900">
            First Choice Transportation
          </h1>
          <p className="text-lg text-slate-600">
            Professional transportation services you can count on. Our driver
            timesheet app keeps your team organized and your routes verified.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-semibold text-slate-800">
            About the App
          </h2>
          <p className="text-slate-600">
            The First Choice Transportation app helps drivers clock in and out,
            track shifts with GPS verification, and manage their schedules.
            Admins can review shifts, flag anomalies, and ensure compliance.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-slate-800">
            Get in Touch
          </h2>
          <p className="mb-4 text-slate-600">
            Need help? Visit our{" "}
            <Link href="/support" className="text-blue-600 hover:underline">
              Support page
            </Link>{" "}
            for assistance.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-4xl px-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} First Choice Transportation
        </div>
      </footer>
    </div>
  );
}
