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
    const name = String(body.name || "").trim();
    const emailRaw = String(body.email || "").trim().toLowerCase();

    if (!name || !emailRaw) {
      return json({ error: "Nome e e-mail são obrigatórios." }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return json({ error: "Informe um e-mail válido." }, 400);
    }

    if (emailRaw.endsWith("@no-login.louvorhub.local")) {
      return json({ error: "E-mail inválido." }, 400);
    }

    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) {
      return json({ error: listError.message }, 400);
    }

    const existing = (listed.users || []).find(
      (u) => (u.email || "").toLowerCase() === emailRaw,
    );

    if (existing) {
      const { data: profile } = await admin
        .from("profiles")
        .select("account_status")
        .eq("id", existing.id)
        .maybeSingle();

      const status = profile?.account_status || "pending";
      if (status === "approved") {
        return json({
          ok: true,
          message:
            "Este e-mail já possui cadastro aprovado. Use Entrar para receber o magic link.",
          alreadyRegistered: true,
        });
      }
      if (status === "rejected") {
        return json({
          error:
            "Cadastro não aprovado. Entre em contato com o administrador do LouvorHub.",
        }, 400);
      }
      return json({
        ok: true,
        message:
          "Cadastro já enviado e aguardando aprovação do administrador.",
        pending: true,
      });
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: emailRaw,
      email_confirm: true,
      password: `${crypto.randomUUID()}Aa1!`,
      user_metadata: { display_name: name },
    });

    if (createError) {
      return json({ error: createError.message || "Não foi possível criar a conta." }, 400);
    }

    const userId = created.user?.id;
    if (!userId) {
      return json({ error: "Falha ao obter id do usuário." }, 400);
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        display_name: name,
        account_status: "pending",
      })
      .eq("id", userId);

    if (profileError) {
      return json({ error: profileError.message }, 400);
    }

    return json({
      ok: true,
      message:
        "Cadastro recebido! Aguarde a aprovação do administrador para entrar com magic link.",
      pending: true,
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
