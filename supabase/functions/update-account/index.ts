import { corsHeaders, serviceClient, requireAdmin, countActiveAdmins } from "../_shared/adminAuth.ts";

// Admin-only: edits an existing account's name, phone, hospital assignment,
// and (optionally) role — including promoting/demoting to and from ADMIN.
// Deliberately does NOT touch email — that's the Supabase Auth login
// identifier, not just a contact field; changing it out from under someone
// without them knowing is a different, more delicate operation than fixing
// a typo'd name or reassigning a hospital.
//
// Two guardrails on role changes so an admin can't lock everyone out:
// you can't change your own role, and you can't demote the last ADMIN.
//
// No ref doctor either — every doctor in a hospital can already see/act on
// every patient there (see 2026-07-30_partogramme_ref_doctor_nullable.sql),
// so pre-assigning a nurse to one doesn't do anything real anymore.

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = serviceClient();

  try {
    const caller = await requireAdmin(req, admin);

    const body = await req.json();
    const { userInfoId, firstName, lastName, phone, hospitalId, role } = body;

    if (!userInfoId || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: "userInfoId, firstName and lastName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (role !== undefined && role !== "NURSE" && role !== "DOCTOR" && role !== "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: target, error: fetchError } = await admin
      .from("userInfo")
      .select("id, role, profileId, nurseType")
      .eq("id", userInfoId)
      .single();
    if (fetchError || !target) {
      return new Response(
        JSON.stringify({ error: "Account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isRoleChange = role !== undefined && role !== target.role;
    if (isRoleChange && target.profileId === caller.id) {
      return new Response(
        JSON.stringify({ error: "You can't change your own role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (isRoleChange && target.role === "ADMIN" && (await countActiveAdmins(admin)) <= 1) {
      return new Response(
        JSON.stringify({ error: "At least one admin account must remain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // nurseType/maternityId aren't editable from this form yet (maternity
    // nurses have no maternity picker here) — leave them untouched for an
    // existing maternity nurse staying a nurse. If the role is changed away
    // from NURSE, drop nurseType/maternityId since they only apply to nurses.
    const effectiveRole = role !== undefined ? role : target.role;
    const isMaternityNurse = effectiveRole === "NURSE" && target.nurseType === "MATERNITY";

    const { error: updateError } = await admin
      .from("userInfo")
      .update({
        firstName,
        lastName,
        phone: phone ?? "",
        ...(isMaternityNurse
          ? {}
          : {
              hospitalId: hospitalId ?? null,
              ...(effectiveRole !== "NURSE" ? { nurseType: null, maternityId: null } : {}),
            }),
        ...(role !== undefined ? { role } : {}),
      })
      .eq("id", userInfoId);
    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
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
