import Link from "next/link";
import { Nav } from "@/components/Nav";

export const metadata = {
  title: "Support | First Choice Transportation",
  description: "Get help with the First Choice Transportation app.",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-xl font-semibold text-slate-800 hover:text-slate-600"
          >
            First Choice Transportation
          </Link>
          <Nav currentPath="/support" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-8 text-4xl font-bold tracking-tight text-slate-900">
          Support
        </h1>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-slate-800">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-medium text-slate-800">
                How do I start a shift?
              </h3>
              <p className="text-slate-600">
                Tap &quot;Start Shift&quot; on the home screen. Make sure
                location permissions are enabled so your route can be verified.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-medium text-slate-800">
                How do I end a shift?
              </h3>
              <p className="text-slate-600">
                Go to the Shift tab and tap &quot;Final Dropoff&quot;. Enter
                your final location to complete the shift.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-medium text-slate-800">
                Why is my shift flagged?
              </h3>
              <p className="text-slate-600">
                Shifts may be flagged for unusual patterns (e.g., very long
                duration, no movement). Contact your administrator if you
                believe a flag is incorrect.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-slate-800">
            Contact Us
          </h2>
          <p className="text-slate-600">
            For technical support or account issues, please contact your
            administrator or reach out to First Choice Transportation directly.
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
