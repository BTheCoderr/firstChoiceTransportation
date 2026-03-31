import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateDriverRequest {
  email: string;
  full_name: string;
  password: string;
  /** Optional. If lat+lng provided, creates driver's home base. */
  home_base_address?: string | null;
  home_base_latitude?: number | null;
  home_base_longitude?: number | null;
}

function getUserIdFromJwt(jwt: string): string | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    const payload = JSON.parse(atob(base64));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Missing or invalid authorization" }, 200);
    }

    const token = authHeader.replace("Bearer ", "");
    const callerId = getUserIdFromJwt(token);
    if (!callerId) {
      return jsonResponse({ success: false, error: "Invalid token" }, 200);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    /**
     * Prefer custom secrets when set (dashboard may lock `SUPABASE_SERVICE_ROLE_KEY`).
     * `SUPABASEE_SERVICE_ROLE` supports the common typo if the UI rejects the correct name.
     */
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE")?.trim() ||
      Deno.env.get("SUPABASEE_SERVICE_ROLE")?.trim() ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "create-driver: missing SUPABASE_URL or service role secret"
      );
      return jsonResponse(
        {
          success: false,
          error:
            "Server misconfiguration: set service_role JWT as secret SUPABASE_SERVICE_ROLE (or SUPABASEE_SERVICE_ROLE if the UI required that spelling), ensure SUPABASE_URL is set, then redeploy create-driver.",
        },
        200
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();

    if (!profile || profile.role !== "admin") {
      return jsonResponse({ success: false, error: "Admin role required" }, 200);
    }

    const body = (await req.json()) as CreateDriverRequest & Record<string, unknown>;
    const {
      email,
      full_name,
      password,
      home_base_address,
      home_base_latitude: rawLat,
      home_base_longitude: rawLng,
    } = body;

    const home_base_latitude =
      typeof rawLat === "number" ? rawLat : typeof rawLat === "string" ? Number(rawLat) : null;
    const home_base_longitude =
      typeof rawLng === "number" ? rawLng : typeof rawLng === "string" ? Number(rawLng) : null;

    if (!email?.trim() || !full_name?.trim()) {
      return jsonResponse({ success: false, error: "Email and full name are required" }, 200);
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return jsonResponse({ success: false, error: "Password must be at least 6 characters" }, 200);
    }

    const { data: user, error } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role: "driver",
      },
    });

    if (error) {
      return jsonResponse({ success: false, error: error.message }, 200);
    }

    const userId = user.user.id;
    const lat = home_base_latitude;
    const lng = home_base_longitude;
    const hasValidBase =
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    if (hasValidBase) {
      const { error: baseError } = await supabase.from("driver_bases").insert({
        driver_id: userId,
        name: "Home",
        latitude: lat,
        longitude: lng,
        address: home_base_address?.trim() || null,
        is_default: true,
      });

      if (baseError) {
        console.error("Failed to create driver base:", baseError);
        // Driver was created; base creation failed. Return success but log.
        // Admin can set base later from driver detail.
      }
    }

    return jsonResponse({
      success: true,
      userId,
      email: user.user.email,
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ success: false, error: "Internal server error" }, 200);
  }
});
