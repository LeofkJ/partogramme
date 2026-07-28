import { corsHeaders, serviceClient, requireAdmin } from "../_shared/adminAuth.ts";

// Admin-only: removes a NURSE or DOCTOR account's access completely,
// both isDeleted on userInfo (consistent with the soft-delete pattern used
// everywhere else in this app) AND a ban on the underlying Supabase Auth
// account, so the login attempt itself fails, not just RLS-blocked once
// they're already past login. Never usable against an ADMIN account.

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = serviceClient();

  try {
    await requireAdmin(req, admin);

    const { userInfoId } = await req.json();
    if (!userInfoId) {
      return new Response(
        JSON.stringify({ error: "userInfoId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: target, error: fetchError } = await admin
      .from("userInfo")
      .select("id, profileId, role")
      .eq("id", userInfoId)
      .single();
    if (fetchError || !target) {
      return new Response(
        JSON.stringify({ error: "Account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (target.role === "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Admin accounts can't be removed here" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: updateError } = await admin
      .from("userInfo")
      .update({ isDeleted: true })
      .eq("id", userInfoId);
    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ~100 years, effectively permanent, but a ban rather than a hard
    // delete so the account/data relationships (profileId FKs) stay intact.
    const { error: banError } = await admin.auth.admin.updateUserById(target.profileId, {
      ban_duration: "876000h",
    });
    if (banError) {
      return new Response(
        JSON.stringify({ error: banError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (thrown) {
    if (thrown instanceof Response) return thrown;
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
