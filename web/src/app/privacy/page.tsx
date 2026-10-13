import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-xl font-semibold">First Choice Transportation</Link>
          <Nav currentPath="/privacy" />
        </div>
      </header>
      <div className="mx-auto max-w-3xl space-y-7 px-6 py-14">
        <h1 className="text-4xl font-bold">Privacy information</h1>
        <p className="text-sm text-slate-600">Last updated October 13, 2026</p>
        <p>The First Choice Transportation driver app handles employee account details, time entries, and location data used to support company shift verification.</p>
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Information processed</h2>
          <p>Account and profile information may include an employee’s name, email, and assigned role. Shift records can include clock-in and clock-out times, GPS coordinates, route points, movement information, assigned bases, and manager review flags.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Location permissions</h2>
          <p>Authorized drivers are asked for foreground and background location access to support GPS tracking during active shifts. A location permission may be required to start or finish a GPS-verified shift. Device permissions can be managed in system settings.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Access and service providers</h2>
          <p>Driver accounts are designed to access their own shift records. Authorized company administrators can review driver records, hours, and routes. The application uses Supabase for account and operational-data services.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Corrections and questions</h2>
          <p>Ask your company administrator to review an inaccurate shift record or direct a request about data access, correction, or retention to the organization responsible for your account.</p>
        </section>
        <p className="text-sm text-slate-600">This page describes the app’s current technical data flows, not a complete statement of the operator’s retention and disclosure policies. Those must be confirmed with the company before public release. <Link className="text-blue-700 underline" href="/support">Support</Link></p>
      </div>
    </main>
  );
}
