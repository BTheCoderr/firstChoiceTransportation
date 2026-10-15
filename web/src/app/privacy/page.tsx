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
        <p className="text-sm text-slate-600">Updated October 15, 2026</p>
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
          <p>Driver accounts are designed to access their own shift records. Authorized company administrators can review driver records, hours, and routes. The application uses Supabase for account and operational-data services, Netlify for the public website, and Apple to distribute the iOS app.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Retention and deletion</h2>
          <p>Authorized company personnel review deletion requests against employment, payroll, legal and audit obligations. Account access can be disabled while some historical work records remain legally necessary. Specific retention periods are set by the responsible operating company, not by this app.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Corrections and questions</h2>
          <p>For payroll accuracy, personal data access, correction, retention, and account deletion requests, use My driver profile → Request account deletion or the in-app Support Center to contact your authorized company administrator. A deletion request does not automatically erase payroll and location records that must be retained for employment, tax, or legal obligations.</p>
        </section>
        <p className="text-sm text-slate-600">Employee GPS tracking is tied to a driver-started active shift; the company must confirm and publish its actual data retention schedule and responsible support contact before public distribution. This page does not claim an unverified retention period. <Link className="text-blue-700 underline" href="/support">Support</Link></p>
      </div>
    </main>
  );
}
