import Link from "next/link";
import { Nav } from "@/components/Nav";

export const metadata = {
  title: "Privacy Policy | First Choice Transportation",
  description: "Privacy policy for the First Choice Transportation app.",
};

export default function PrivacyPage() {
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
          <Nav currentPath="/privacy" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-8 text-4xl font-bold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mb-8 text-slate-600">
          Last updated: {new Date().toLocaleDateString("en-US")}
        </p>

        <div className="space-y-8 text-slate-600">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-800">
              Overview
            </h2>
            <p>
              First Choice Transportation (&quot;we&quot;, &quot;our&quot;, or
              &quot;us&quot;) operates the First Choice Transportation mobile
              application. This Privacy Policy explains how we collect, use,
              and protect your information when you use our app.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-800">
              Information We Collect
            </h2>
            <p className="mb-3">
              When you use our app, we may collect:
            </p>
            <ul className="list-inside list-disc space-y-2">
              <li>
                <strong>Account information:</strong> Email address and profile
                details you provide when signing up.
              </li>
              <li>
                <strong>Location data:</strong> GPS coordinates during your
                shifts to verify work hours and routes. This data is used solely
                for timesheet verification and is shared only with your
                administrator.
              </li>
              <li>
                <strong>Shift data:</strong> Start and end times, route points,
                and related work records.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-800">
              How We Use Your Information
            </h2>
            <p>
              We use the information we collect to provide and improve the app,
              verify shift times and routes, communicate with you, and comply
              with legal obligations. Location data is used exclusively for
              timesheet verification and is not sold or shared with third
              parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-800">
              Data Storage and Security
            </h2>
            <p>
              Your data is stored securely using industry-standard practices.
              We use Supabase for authentication and data storage. Access to
              your data is restricted to you and your organization&apos;s
              administrators.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-800">
              Your Rights
            </h2>
            <p>
              You may request access to, correction of, or deletion of your
              personal data. Contact your administrator or reach out to us
              directly to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-800">
              Contact Us
            </h2>
            <p>
              For questions about this Privacy Policy or our data practices,
              please visit our{" "}
              <Link href="/support" className="text-blue-600 hover:underline">
                Support page
              </Link>{" "}
              or contact your administrator.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-4xl px-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} First Choice Transportation
        </div>
      </footer>
    </div>
  );
}
