import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const RESET_REDIRECT =
  "https://firstchoicetransportation.netlify.app/auth/reset-password";

function respond(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}

function randomPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return respond({ success: false, error: "Method not allowed" }, 405);

  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return respond({ success: false, error: "Sign in as an administrator first." }, 401);
    }
    const url = Deno.env.get("SUPABASE_URL");
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE");
    if (!url || !secret) {
      console.error("create-driver: missing server environment configuration");
      return respond({ success: false, error: "Driver invitations are not configured on the server." }, 503);
    }

    const server = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // Never decode JWT claims or trust a caller-supplied role/company.
    const token = authHeader.slice(7).trim();
    const { data: userData, error: userError } = await server.auth.getUser(token);
    if (userError || !userData.user) {
      return respond({ success: false, error: "Invalid or expired administrator session." }, 401);
    }
    const { data: admin, error: adminError } = await server.from("profiles")
      .select("role,company_id").eq("id", userData.user.id).single();
    if (adminError || !admin || admin.role !== "admin" || !admin.company_id) {
      return respond({ success: false, error: "Company administrator access required." }, 403);
    }

    const payload: unknown = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return respond({ success: false, error: "Enter a driver email address." }, 400);
    }
    const input = payload as {
      email?: unknown; password?: unknown; full_name?: unknown;
    };
    // Old deployed clients still ask administrators for temporary passwords.
    // Reject those requests rather than misleading the admin that the
    // employee can sign in with a password the server intentionally ignored.
    if ("password" in input || "full_name" in input) {
      return respond({ success: false,
        error: "This version of First Choice is outdated. Update the app before inviting new drivers." }, 409);
    }
    const email = typeof input.email === "string"
      ? input.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return respond({ success: false, error: "Enter a valid driver email address." }, 400);
    }

    // Reconcile a previously interrupted invitation BEFORE creating anything.
    // The service-role function only recovers the original Auth user when its
    // server-issued provisioning key, company and original administrator match.
    const { data: existingState, error: existingError } = await server.rpc(
      "finalize_driver_provisioning", { p_email: email, p_company_id: admin.company_id }
    );
    if (existingError) {
      console.error("create-driver: reconciliation unavailable", existingError.code);
      return respond({ success: false,
        error: "Driver invitations are temporarily unavailable. No new account was created." }, 503);
    }
    const sendActivation = async (wasRecovered: boolean) => {
      const { error: mailError } = await server.auth.resetPasswordForEmail(email, {
        redirectTo: RESET_REDIRECT,
      });
      if (mailError) console.error("create-driver: activation email request failed", mailError.message);
      return respond({
        success: true, email, activationEmailSent: !mailError,
        message: mailError
          ? "Driver account is ready, but the activation email could not be sent. Use Forgot Password after email delivery is working."
          : wasRecovered
            ? "Existing driver activation recovered. A new password setup email was requested; confirm delivery."
            : "Driver profile created. A password setup email was requested; confirm delivery.",
      });
    };
    if (existingState === "recovered" || existingState === "pending_activation") {
      return await sendActivation(true);
    }
    if (existingState === "already_active") {
      return respond({ success: false,
        error: "This driver already has an account. Ask them to sign in or use Forgot Password." }, 409);
    }
    if (existingState !== "not_found") {
      return respond({ success: false,
        error: "This email already has an account or pending record that needs administrator review. No duplicate was created." }, 409);
    }

    // One-time intent is written with trusted company + admin identity.
    // Auth's trigger may not run after app_metadata is fully populated; the
    // explicit finalization step below handles that timing safely.
    const key = crypto.randomUUID();
    const { data: intent, error: intentError } = await server
      .from("driver_provisioning_intents")
      .insert({ email, company_id: admin.company_id,
        created_by: userData.user.id, provisioning_key: key })
      .select("id").single();
    if (intentError || !intent) {
      return respond({ success: false,
        error: "This driver may already be provisioned. Check the driver list before retrying." }, 409);
    }

    const { data: created, error: creationError } = await server.auth.admin.createUser({
      email,
      password: randomPassword(),
      email_confirm: true,
      app_metadata: { first_choice_provisioning_key: key },
    });
    if (creationError || !created.user) {
      await server.from("driver_provisioning_intents").delete()
        .eq("id", intent.id).is("consumed_at", null);
      return respond({ success: false, error: "Driver creation failed. Check whether that email already exists." }, 409);
    }

    // Even if Auth's INSERT trigger missed the metadata, never leave a newly
    // created user without its authorized driver profile.
    const { data: finalized, error: finalError } = await server.rpc(
      "finalize_driver_provisioning", { p_email: email, p_company_id: admin.company_id }
    );
    if (finalError || !["recovered", "pending_activation", "already_active"].includes(String(finalized))) {
      console.error("create-driver: post-creation reconciliation failed", finalError?.code ?? finalized);
      return respond({ success: false,
        error: "Driver identity created, but profile setup needs administrator support. Do not invite again." }, 503);
    }
    const { data: profile, error: profileError } = await server.from("profiles")
      .select("id,role,company_id").eq("id", created.user.id).single();
    if (profileError || !profile || profile.role !== "driver" ||
      profile.company_id !== admin.company_id) {
      console.error("create-driver: finalized profile check failed");
      return respond({ success: false,
        error: "Driver identity created, but profile verification failed. Contact an administrator." }, 503);
    }
    return await sendActivation(false);
  } catch (err) {
    console.error("create-driver: unexpected error", err instanceof Error ? err.message : "unknown");
    return respond({ success: false, error: "Driver creation was interrupted. Check the driver list before retrying." }, 500);
  }
});
