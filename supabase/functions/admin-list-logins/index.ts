import { corsHeaders, serviceClient, requireAdmin } from "../_shared/adminAuth.ts";

// Admin-only: returns { [profileId]: lastSignInAt | null } for every auth
// user. Needed for the "Dernière connexion" column on the Admin accounts
// list — last_sign_in_at lives on auth.users, which only the Admin API
// (service_role) can read; there's no RLS-governed table exposing it.
// profileId here is the same id as Profile.id / userInfo.profileId (all
// three are the same auth.users id throughout this app).

const PAGE_SIZE = 200;
const MAX_PAGES = 25; // safety cap — 5,000 users, far past what this app needs

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = serviceClient();

  try {
    await requireAdmin(req, admin);

    const lastSignInByProfileId: Record<string, string | null> = {};

    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      for (const user of data.users) {
        lastSignInByProfileId[user.id] = user.last_sign_in_at;
      }
      if (data.users.length < PAGE_SIZE) break;
    }

    return new Response(
      JSON.stringify({ lastSignInByProfileId }),
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
