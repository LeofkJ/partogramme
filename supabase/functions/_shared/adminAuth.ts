import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Every Edge Function in this project runs with the service_role key, which
// bypasses RLS entirely, which is the only way to reach the Admin API
// (auth.users creation/ban isn't a plain table op RLS can govern). Because
// RLS isn't doing the gatekeeping here, each function must explicitly check
// the caller's role itself before touching anything privileged.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Verifies the request's bearer token belongs to a real, non-deleted ADMIN.
 * Throws a Response-shaped error the caller should return directly. */
export async function requireAdmin(req: Request, admin: SupabaseClient) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    throw new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: callerInfo, error: infoError } = await admin
    .from("userInfo")
    .select("role, isDeleted")
    .eq("profileId", userData.user.id)
    .single();

  if (infoError || !callerInfo || callerInfo.role !== "ADMIN" || callerInfo.isDeleted) {
    throw new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return userData.user;
}
