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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Não autenticado" }, 401);
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await caller.auth.getUser();
    if (userError || !user) {
      return json({ error: "Sessão inválida" }, 401);
    }

    const body = await req.json();
    const orgId = String(body.orgId || "");
    const name = String(body.name || "").trim();
    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
    const churchId = typeof body.churchId === "string" ? body.churchId.trim() : "";
    const status = body.status === "inactive" ? "inactive" : "active";
    const wantAdmin = Boolean(body.isAdmin);
    const skills = Array.isArray(body.skills)
      ? body.skills.map((s: unknown) => String(s).trim()).filter(Boolean)
      : [];
    const grants = Array.isArray(body.grants) ? body.grants : [];

    if (!orgId || !name || !emailRaw) {
      return json({ error: "Nome, e-mail e organização são obrigatórios." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    const isSystemAdmin = Boolean(profile?.is_admin);
    if (!isSystemAdmin) {
      const { data: grant } = await admin
        .from("resource_grants")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "church_editor")
        .eq("org_id", orgId)
        .maybeSingle();
      if (!grant) {
        return json({ error: "Sem permissão para cadastrar usuários." }, 403);
      }
      if (wantAdmin) {
        return json({ error: "Somente administrador pode promover admins." }, 403);
      }
    }

    const { data: userId, error: rpcError } = await admin.rpc("create_org_member", {
      p_org_id: orgId,
      p_name: name,
      p_email: emailRaw,
      p_phone: phone || null,
      p_birth_date: birthDate || null,
      p_skills: skills,
      p_church_id: churchId || null,
      p_status: status,
      p_is_admin: wantAdmin && isSystemAdmin,
    });

    if (rpcError) {
      return json({ error: rpcError.message }, 400);
    }

    if (!userId) {
      return json({ error: "Não foi possível obter o id do usuário." }, 400);
    }

    if (!(wantAdmin && isSystemAdmin) && grants.length) {
      await admin.from("resource_grants").delete().eq("user_id", userId);
      const rows = grants
        .map((g: { role?: string; orgId?: string; groupId?: string }) => {
          if (g.role === "group_editor") {
            if (!g.groupId) return null;
            return {
              user_id: userId,
              role: g.role,
              org_id: g.orgId || null,
              group_id: g.groupId,
            };
          }
          if (!g.orgId) return null;
          return {
            user_id: userId,
            role: g.role,
            org_id: g.orgId,
            group_id: null,
          };
        })
        .filter(Boolean);
      if (rows.length) {
        const { error: grantError } = await admin.from("resource_grants").insert(rows);
        if (grantError) {
          return json({ error: grantError.message }, 400);
        }
      }
    }

    return json({ userId });
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
