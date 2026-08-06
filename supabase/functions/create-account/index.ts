import { corsHeaders, serviceClient, requireAdmin } from "../_shared/adminAuth.ts";

// Admin-only: creates a NURSE, DOCTOR, or ADMIN account, active immediately
// with a generated temp password (no invite email — Supabase's built-in
// mailer is rate-limited to a handful of sends/hour, which made account
// creation itself unreliable). The admin relays the temp password to the
// person out-of-band; userInfo.mustChangePassword forces them to set their
// own password on first login (see Menu.tsx / DialogSetPassword).

function generateTempPassword(): string {
  // Avoids visually ambiguous characters (0/O, 1/I/l) since this gets read
  // aloud/typed by hand when the admin relays it to the new account holder.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = serviceClient();

  try {
    await requireAdmin(req, admin);

    const body = await req.json();
    const { email, firstName, lastName, role, hospitalId, maternityId, nurseType, phone } = body;

    if (!email || !firstName || !lastName || !role) {
      return new Response(
        JSON.stringify({ error: "email, firstName, lastName and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (role !== "NURSE" && role !== "DOCTOR" && role !== "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (nurseType !== undefined && nurseType !== null && nurseType !== "HOSPITAL" && nurseType !== "MATERNITY") {
      return new Response(
        JSON.stringify({ error: "Invalid nurseType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (role === "NURSE" && nurseType === "MATERNITY" && !maternityId) {
      return new Response(
        JSON.stringify({ error: "maternityId is required for a maternity nurse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tempPassword = generateTempPassword();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (createError || !created?.user) {
      return new Response(
        JSON.stringify({ error: createError?.message ?? "Account creation failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const newUserId = created.user.id;

    // createUser can hand back a pre-existing auth id for this email instead
    // of erroring (e.g. an unconfirmed user left over from an earlier
    // partial signup that failed after this step but before userInfo was
    // inserted). Upsert instead of insert so that self-heals instead of
    // hard-failing on Profile_pkey, and guard below against a userInfo row
    // already existing for it (a genuinely completed earlier signup).
    const { error: profileError } = await admin
      .from("Profile")
      .upsert({ id: newUserId, email, isDeleted: false });
    if (profileError) {
      await admin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: existingUserInfo } = await admin
      .from("userInfo")
      .select("id")
      .eq("profileId", newUserId)
      .eq("isDeleted", false)
      .maybeSingle();
    if (existingUserInfo) {
      return new Response(
        JSON.stringify({ error: "An account already exists for this email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isMaternityNurse = role === "NURSE" && nurseType === "MATERNITY";

    const { error: userInfoError } = await admin.from("userInfo").insert({
      id: crypto.randomUUID(),
      profileId: newUserId,
      firstName,
      lastName,
      role,
      hospitalId: isMaternityNurse ? null : (hospitalId ?? null),
      maternityId: isMaternityNurse ? maternityId : null,
      nurseType: role === "NURSE" ? (nurseType ?? "HOSPITAL") : null,
      phone: phone ?? "",
      isDeleted: false,
      mustChangePassword: true,
    });
    if (userInfoError) {
      await admin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: userInfoError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ userId: newUserId, tempPassword }),
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
