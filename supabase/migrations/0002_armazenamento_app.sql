-- Senhor Multas · armazenamento usado pela aplicação (piloto).
-- Registros por coleção em jsonb; acesso SOMENTE pelo servidor, via funções que exigem o segredo do
-- servidor (SM_SERVER_SECRET, guardado como hash). Nenhum acesso direto de anon/authenticated às tabelas.
-- O schema normalizado (0001_schema.sql) é o alvo para escalar.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sm_config (chave text primary key, valor text not null);
alter table public.sm_config enable row level security;
revoke all on public.sm_config from anon, authenticated;

create table if not exists public.sm_registros (
  colecao text not null,
  id text not null,
  dono_id text,
  data jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (colecao, id)
);
create index if not exists sm_registros_dono on public.sm_registros (dono_id);
alter table public.sm_registros enable row level security;
revoke all on public.sm_registros from anon, authenticated;

create or replace function public.sm_checar(p_segredo text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_segredo is null or encode(extensions.digest(p_segredo, 'sha256'), 'hex') is distinct from (select valor from sm_config where chave = 'segredo_hash') then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
end $$;

create or replace function public.sm_carregar(p_segredo text)
returns table (colecao text, id text, data jsonb)
language plpgsql security definer set search_path = public as $$
begin
  perform sm_checar(p_segredo);
  return query select r.colecao, r.id, r.data from sm_registros r;
end $$;

create or replace function public.sm_gravar(p_segredo text, p_linhas jsonb, p_apagar jsonb default '[]')
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform sm_checar(p_segredo);
  delete from sm_registros r using jsonb_array_elements(p_apagar) a
   where r.colecao = a->>'colecao' and r.id = a->>'id';
  insert into sm_registros (colecao, id, dono_id, data, atualizado_em)
  select l->>'colecao', l->>'id', l->>'dono_id', l->'data', now() from jsonb_array_elements(p_linhas) l
  on conflict (colecao, id) do update set data = excluded.data, dono_id = excluded.dono_id, atualizado_em = now();
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.sm_apagar_tudo(p_segredo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform sm_checar(p_segredo);
  delete from sm_registros where true;
end $$;

-- Cria usuário no Supabase Auth já confirmado (sem e-mail de confirmação no piloto).
create or replace function public.sm_criar_usuario(p_segredo text, p_email text, p_senha text)
returns uuid language plpgsql security definer set search_path = public, extensions, auth as $$
declare uid uuid := gen_random_uuid();
begin
  perform sm_checar(p_segredo);
  if exists (select 1 from auth.users where lower(email) = lower(p_email)) then
    raise exception 'email_ja_cadastrado' using errcode = '23505';
  end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', lower(p_email),
    extensions.crypt(p_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', lower(p_email), 'email_verified', true), 'email', now(), now(), now());
  return uid;
end $$;

revoke all on function public.sm_checar(text) from public, anon, authenticated;
revoke all on function public.sm_carregar(text) from public;
revoke all on function public.sm_gravar(text, jsonb, jsonb) from public;
revoke all on function public.sm_apagar_tudo(text) from public;
revoke all on function public.sm_criar_usuario(text, text, text) from public;
grant execute on function public.sm_carregar(text) to anon;
grant execute on function public.sm_gravar(text, jsonb, jsonb) to anon;
grant execute on function public.sm_apagar_tudo(text) to anon;
grant execute on function public.sm_criar_usuario(text, text, text) to anon;
