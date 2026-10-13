import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-xl font-semibold">First Choice Transportation</Link>
          <Nav currentPath="/support" />
        </div>
      </header>
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-14">
        <h1 className="text-4xl font-bold">App support</h1>
        <p className="text-slate-700">First Choice Transportation is a workforce app used by authorized drivers and company administrators.</p>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Sign-in and accounts</h2>
          <p>Driver accounts are set up by a company administrator. If you cannot sign in, ask your administrator to confirm your account or reset your password from the app’s sign-in screen.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Location and shifts</h2>
          <p>Enable location access, including background location while on shift, to record routes and verify work hours. If your shift cannot start or close, check permissions and contact your administrator before attempting another shift.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Incorrect hours or routes</h2>
          <p>Do not create a duplicate shift to correct an error. Ask your administrator to review the affected shift and its GPS records.</p>
        </section>
        <p className="text-sm text-slate-600">For privacy or data-access questions, see our <Link className="text-blue-700 underline" href="/privacy">privacy information</Link> and contact your organization administrator.</p>
      </div>
    </main>
  );
}
