import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const token = String(body.token || "").trim();
    const name = String(body.name || "").trim();

    if (!token) {
      return json({ error: "Token do convite é obrigatório." }, 400);
    }

    const { data: inviteRows, error: inviteError } = await admin
      .from("org_invitations")
      .select("*, organizations(name)")
      .eq("token", token)
      .limit(1);

    if (inviteError) {
      return json({ error: inviteError.message }, 400);
    }

    const invite = inviteRows?.[0] as
      | {
          id: string;
          org_id: string;
          email: string;
          display_name: string | null;
          status: string;
          expires_at: string;
          organizations?: { name?: string } | null;
        }
      | undefined;

    if (!invite) {
      return json({ error: "Convite não encontrado." }, 404);
    }

    if (invite.status === "revoked") {
      return json({ error: "Este convite foi cancelado." }, 400);
    }

    if (invite.status === "expired" || new Date(invite.expires_at).getTime() < Date.now()) {
      await admin.from("org_invitations").update({ status: "expired" }).eq("id", invite.id);
      return json({ error: "Este convite expirou." }, 400);
    }

    if (invite.status === "accepted") {
      return json({
        ok: true,
        alreadyMember: true,
        message: "Convite já aceito. Use Entrar com este e-mail.",
      });
    }

    if (invite.status !== "pending") {
      return json({ error: "Convite indisponível." }, 400);
    }

    const email = invite.email.toLowerCase();
    const displayName =
      name || invite.display_name || email.split("@")[0] || "Usuário";

    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) {
      return json({ error: listError.message }, 400);
    }

    let userId = (listed.users || []).find(
      (u) => (u.email || "").toLowerCase() === email,
    )?.id;

    if (!userId) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: `${crypto.randomUUID()}Aa1!`,
        user_metadata: {
          display_name: displayName,
          account_status: "approved",
        },
      });
      if (createError) {
        return json({ error: createError.message || "Não foi possível criar a conta." }, 400);
      }
      userId = created.user?.id;
      if (!userId) {
        return json({ error: "Falha ao obter id do usuário." }, 400);
      }
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        display_name: displayName,
        account_status: "approved",
        approved_at: new Date().toISOString(),
        church_id: invite.org_id,
      })
      .eq("id", userId);

    if (profileError) {
      return json({ error: profileError.message }, 400);
    }

    const { error: memberError } = await admin.from("memberships").upsert(
      {
        org_id: invite.org_id,
        user_id: userId,
        role: "member",
        status: "active",
      },
      { onConflict: "org_id,user_id" },
    );
    if (memberError) {
      return json({ error: memberError.message }, 400);
    }

    const { error: acceptError } = await admin
      .from("org_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_user_id: userId,
      })
      .eq("id", invite.id);

    if (acceptError) {
      return json({ error: acceptError.message }, 400);
    }

    const orgName = invite.organizations?.name || "a igreja";

    return json({
      ok: true,
      message: `Conta pronta e associada a ${orgName}. Use Entrar com o e-mail ${email} para receber o magic link.`,
    });
  } catch (e) {
    return json({ error: (e as Error).message || "Erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
