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
            A private employee operations app for authorized First Choice drivers
            and administrators. Record GPS-verified shifts, review payable hours,
            and contact your company support team.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-semibold text-slate-800">
            About the App
          </h2>
          <p className="text-slate-600">
            Drivers use the app to start work shifts and record route evidence while
            tracking is enabled. Administrators provision accounts, approve
            shift corrections, and review payroll records. Automatic GPS
            clock-out remains in a controlled pilot.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-slate-800">
            Get in Touch
          </h2>
          <p className="mb-4 text-slate-600">
            Already an employee? Your administrator can provide an authorized TestFlight
            invitation to install the app. Need account or shift help? Visit our{" "}
            <Link href="/support" className="text-blue-600 hover:underline">
              Support page
            </Link>{" "}
            for assistance.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-4xl px-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} First Choice Transportation.{" "}
          <Link href="/privacy" className="underline">Privacy</Link>{" · "}
          <Link href="/support" className="underline">Support</Link>
        </div>
      </footer>
    </div>
  );
}
