import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type GrantInput = {
  role: string;
  orgId?: string;
  groupId?: string;
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
    const grants = Array.isArray(body.grants) ? (body.grants as GrantInput[]) : [];

    if (!orgId || !name) {
      return json({ error: "Nome e organização são obrigatórios." }, 400);
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

    const authEmail =
      emailRaw || `member-${crypto.randomUUID()}@no-login.louvorhub.local`;

    let userId: string | null = null;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: authEmail,
      email_confirm: true,
      password: `${crypto.randomUUID()}Aa1!`,
      user_metadata: { display_name: name },
    });

    if (createError) {
      const msg = createError.message || "";
      const already =
        /already|registered|exists|duplicate/i.test(msg) && Boolean(emailRaw);
      if (!already) {
        return json({ error: msg || "Falha ao criar usuário no Auth." }, 400);
      }

      // Usuário já existe: vincula à org
      const { data: listed, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listError) {
        return json({ error: listError.message }, 400);
      }
      const found = (listed.users || []).find(
        (u) => (u.email || "").toLowerCase() === emailRaw,
      );
      if (!found) {
        return json(
          {
            error:
              "Este e-mail já está cadastrado, mas não foi possível localizar o usuário. Peça para ele entrar com magic link e usar o código da igreja.",
          },
          400,
        );
      }
      userId = found.id;
    } else {
      userId = created.user?.id ?? null;
    }

    if (!userId) {
      return json({ error: "Não foi possível obter o id do usuário." }, 400);
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        display_name: name,
        phone: phone || null,
        birth_date: birthDate || null,
        skills,
        main_role: skills[0] || null,
        church_id: churchId || null,
        is_admin: wantAdmin && isSystemAdmin,
      })
      .eq("id", userId);

    if (profileError) {
      return json({ error: profileError.message }, 400);
    }

    const { error: memError } = await admin.from("memberships").upsert(
      {
        org_id: orgId,
        user_id: userId,
        role: "member",
        status,
      },
      { onConflict: "org_id,user_id" },
    );
    if (memError) {
      return json({ error: memError.message }, 400);
    }

    if (!(wantAdmin && isSystemAdmin) && grants.length) {
      await admin.from("resource_grants").delete().eq("user_id", userId);
      const rows = grants
        .map((g) => {
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
