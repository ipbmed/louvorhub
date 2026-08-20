# LouvorHub

Plataforma de louvor (hinos, repertórios, igrejas, escalas e liturgias) com backend **Supabase**.

O schema parte das migrations do projeto `ipbsong-2`, com extensões específicas da UI LouvorHub (categorias, favoritos, escalas ricas, etc.).

## Pré-requisitos

- Node.js 20+
- Conta/projeto [Supabase](https://supabase.com)
- (Opcional) [Supabase CLI](https://supabase.com/docs/guides/cli) para aplicar migrations

## Configuração Supabase

1. Crie um **projeto novo** no Supabase.
2. Aplique as migrations em ordem:

```bash
# na pasta do repositório
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Ou execute manualmente os SQL em:

- `supabase/migrations/20260801120000_initial.sql`
- `supabase/migrations/20260801210000_org_sigla.sql`
- `supabase/migrations/20260808220000_louvorhub_extensions.sql`

3. Em **Authentication → URL Configuration**, inclua os redirects do app (ex.: `http://localhost:3000/**`).
4. Habilite o provider **Email** com magic link / OTP.

## App local

1. Instale dependências: `npm install`
2. Copie `.env.example` para `.env.local` e preencha:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Rode: `npm run dev` (porta 3000)
4. Typecheck: `npm run lint`

## Domínio (UI)

| UI | Tabela Supabase |
|----|-----------------|
| Song | `songs` (+ `song_versions`, `song_links`) |
| Category | `categories` |
| Church | `organizations` |
| MusicGroup / MusicGroupMember | `groups` / `group_members` |
| Setlist | `playlists` + `playlist_items` |
| WorshipSchedule | `schedules` + `schedule_assignments` + `schedule_songs` |
| Liturgy | `liturgies` + `liturgy_items` |
| SystemUser | `profiles` + `memberships` |

Auth: magic link (`signInWithOtp`). Papéis: `owner` | `admin` | `leader` | `member`.

## Estrutura relevante

```
src/lib/          # cliente Supabase + tipos DB
src/contexts/     # AuthProvider
src/hooks/useOrg  # igreja ativa + permissões
src/services/     # CRUD PostgREST
src/adapters/     # DB ↔ modelos da UI
supabase/migrations/
```
