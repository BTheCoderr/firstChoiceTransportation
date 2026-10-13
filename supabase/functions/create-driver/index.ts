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

    const input = await request.json() as { email?: unknown };
    const email = typeof input.email === "string"
      ? input.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return respond({ success: false, error: "Enter a valid driver email address." }, 400);
    }

    // One-time intent is written with trusted company + admin identity.
    // Auth's trigger consumes it ONLY when app_metadata carries its unique
    // server-generated key. Unsolicited public signup never creates a profile.
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

    const { data: profile, error: profileError } = await server.from("profiles")
      .select("id,role,company_id").eq("id", created.user.id).single();
    if (profileError || !profile ||
      profile.role !== "driver" || profile.company_id !== admin.company_id) {
      console.error("create-driver: provisioning result did not create a valid profile", created.user.id);
      return respond({ success: false,
        error: "Driver account was created, but activation requires administrator support. Do not invite again." }, 503);
    }

    // The employee chooses their OWN password via a one-use recovery link.
    // Admins never choose, store or share the employee's password.
    const { error: mailError } = await server.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT,
    });
    if (mailError) {
      console.error("create-driver: activation email delivery failed", mailError.message);
    }
    return respond({
      success: true, userId: created.user.id, email,
      activationEmailSent: !mailError,
      message: mailError
        ? "Driver profile created. Activation email could not be sent. Ask driver to use Forgot Password after mail is configured."
        : "Driver profile created. The driver will receive a link to set a password and complete their information.",
    });
  } catch (err) {
    console.error("create-driver: unexpected error", err instanceof Error ? err.message : "unknown");
    return respond({ success: false, error: "Driver creation was interrupted. Check the driver list before retrying." }, 500);
  }
});
