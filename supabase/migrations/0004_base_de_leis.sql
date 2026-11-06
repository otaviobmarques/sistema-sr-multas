-- Senhor Multas · Base de leis (cap. 6): normas do ctresb/leis + curadoria própria,
-- quebradas por artigo/parágrafo/inciso/alínea, com hash, URN e link oficial. Busca em português.
-- Acesso somente pelo servidor (funções com o segredo do servidor).

create table if not exists public.normas (
  id text primary key,                 -- ex.: ctb, contran-res-798-2020
  urn text not null,
  sigla text not null,                 -- ex.: "CTB (Lei 9.503/1997)"
  titulo text not null,
  tipo text not null,
  numero text,
  data date,
  ementa text,
  fonte_oficial_url text,
  versao_texto text,
  origem text not null default 'ctresb/leis',   -- ctresb/leis | curadoria
  repo_path text,
  repo_commit text,
  git_sha text,                        -- sha do arquivo no repositório (detecta mudanças)
  baixado_em date,
  trechos int not null default 0,
  revogada boolean,
  sincronizada_em timestamptz not null default now()
);

create table if not exists public.normas_trechos (
  id text primary key,                 -- ex.: ctb-art281-par1-inc2
  norma_id text not null references public.normas(id) on delete cascade,
  urn text not null,                   -- urn da norma + !art281_par1_inc2
  rotulo text not null,                -- "CTB (Lei 9.503/1997), art. 281, § 1º, II"
  nivel text not null,                 -- artigo | caput | paragrafo | inciso | alinea
  artigo text,
  texto text not null,
  contexto text,                       -- texto do dispositivo "pai" (caput/§/inciso)
  nota text,                           -- notas de redação (ex.: "redação dada pela Lei ...")
  revogado boolean not null default false,
  ordem int not null default 0,
  hash text not null,
  sincronizado_em timestamptz not null default now(),
  busca tsvector generated always as (
    setweight(to_tsvector('portuguese', coalesce(rotulo, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(texto, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(contexto, '')), 'C')
  ) stored
);
create index if not exists normas_trechos_busca on public.normas_trechos using gin (busca);
create index if not exists normas_trechos_norma on public.normas_trechos (norma_id, ordem);

alter table public.normas enable row level security;
alter table public.normas_trechos enable row level security;
revoke all on public.normas, public.normas_trechos from anon, authenticated;

-- Gravação em lote (importação e sincronização)
create or replace function public.sm_normas_gravar(p_segredo text, p_normas jsonb, p_trechos jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform sm_checar(p_segredo);
  insert into normas (id, urn, sigla, titulo, tipo, numero, data, ementa, fonte_oficial_url, versao_texto, origem, repo_path, repo_commit, git_sha, baixado_em, trechos, revogada, sincronizada_em)
  select x.id, x.urn, x.sigla, x.titulo, x.tipo, x.numero, x.data, x.ementa, x.fonte_oficial_url, x.versao_texto, coalesce(x.origem, 'ctresb/leis'), x.repo_path, x.repo_commit, x.git_sha, x.baixado_em, coalesce(x.trechos, 0), x.revogada, now()
  from jsonb_to_recordset(p_normas) as x(id text, urn text, sigla text, titulo text, tipo text, numero text, data date, ementa text, fonte_oficial_url text, versao_texto text, origem text, repo_path text, repo_commit text, git_sha text, baixado_em date, trechos int, revogada boolean)
  on conflict (id) do update set urn = excluded.urn, sigla = excluded.sigla, titulo = excluded.titulo, tipo = excluded.tipo, numero = excluded.numero, data = excluded.data,
    ementa = excluded.ementa, fonte_oficial_url = excluded.fonte_oficial_url, versao_texto = excluded.versao_texto, origem = excluded.origem, repo_path = excluded.repo_path,
    repo_commit = excluded.repo_commit, git_sha = excluded.git_sha, baixado_em = excluded.baixado_em, trechos = excluded.trechos, revogada = excluded.revogada, sincronizada_em = now();

  insert into normas_trechos (id, norma_id, urn, rotulo, nivel, artigo, texto, contexto, nota, revogado, ordem, hash, sincronizado_em)
  select x.id, x.norma_id, x.urn, x.rotulo, x.nivel, x.artigo, x.texto, x.contexto, x.nota, coalesce(x.revogado, false), coalesce(x.ordem, 0), x.hash, now()
  from jsonb_to_recordset(p_trechos) as x(id text, norma_id text, urn text, rotulo text, nivel text, artigo text, texto text, contexto text, nota text, revogado boolean, ordem int, hash text)
  on conflict (id) do update set norma_id = excluded.norma_id, urn = excluded.urn, rotulo = excluded.rotulo, nivel = excluded.nivel, artigo = excluded.artigo, texto = excluded.texto,
    contexto = excluded.contexto, nota = excluded.nota, revogado = excluded.revogado, ordem = excluded.ordem, hash = excluded.hash, sincronizado_em = now();
  get diagnostics n = row_count;
  return n;
end $$;

-- Remove trechos que deixaram de existir na nova versão de uma norma
create or replace function public.sm_normas_podar(p_segredo text, p_norma_id text, p_manter text[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform sm_checar(p_segredo);
  delete from normas_trechos where norma_id = p_norma_id and not (id = any(p_manter));
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.sm_normas_obter(p_segredo text, p_ids text[])
returns table (id text, norma_id text, urn text, rotulo text, nivel text, artigo text, texto text, contexto text, nota text, revogado boolean, hash text, fonte_oficial_url text, origem text, repo_commit text, sincronizado_em timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform sm_checar(p_segredo);
  return query select t.id, t.norma_id, t.urn, t.rotulo, t.nivel, t.artigo, t.texto, t.contexto, t.nota, t.revogado, t.hash, n.fonte_oficial_url, n.origem, n.repo_commit, t.sincronizado_em
  from normas_trechos t join normas n on n.id = t.norma_id where t.id = any(p_ids);
end $$;

create or replace function public.sm_normas_buscar(p_segredo text, p_consulta text, p_limite int default 12, p_normas text[] default null)
returns table (id text, norma_id text, rotulo text, nivel text, texto text, contexto text, revogado boolean, hash text, fonte_oficial_url text, origem text, relevancia real)
language plpgsql security definer set search_path = public as $$
declare q tsquery := websearch_to_tsquery('portuguese', p_consulta);
begin
  perform sm_checar(p_segredo);
  return query select t.id, t.norma_id, t.rotulo, t.nivel, t.texto, t.contexto, t.revogado, t.hash, n.fonte_oficial_url, n.origem, ts_rank(t.busca, q) as relevancia
  from normas_trechos t join normas n on n.id = t.norma_id
  where t.busca @@ q and not t.revogado and t.nivel <> 'artigo' and (p_normas is null or t.norma_id = any(p_normas))
  order by relevancia desc, t.ordem limit least(greatest(p_limite, 1), 50);
end $$;

create or replace function public.sm_normas_lista(p_segredo text)
returns table (id text, sigla text, titulo text, tipo text, data date, origem text, repo_path text, repo_commit text, git_sha text, trechos int, revogada boolean, fonte_oficial_url text, sincronizada_em timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform sm_checar(p_segredo);
  return query select n.id, n.sigla, n.titulo, n.tipo, n.data, n.origem, n.repo_path, n.repo_commit, n.git_sha, n.trechos, n.revogada, n.fonte_oficial_url, n.sincronizada_em from normas n order by n.origem, n.data desc nulls last;
end $$;

revoke all on function public.sm_normas_gravar(text, jsonb, jsonb) from public, authenticated;
revoke all on function public.sm_normas_podar(text, text, text[]) from public, authenticated;
revoke all on function public.sm_normas_obter(text, text[]) from public, authenticated;
revoke all on function public.sm_normas_buscar(text, text, int, text[]) from public, authenticated;
revoke all on function public.sm_normas_lista(text) from public, authenticated;
grant execute on function public.sm_normas_gravar(text, jsonb, jsonb) to anon;
grant execute on function public.sm_normas_podar(text, text, text[]) to anon;
grant execute on function public.sm_normas_obter(text, text[]) to anon;
grant execute on function public.sm_normas_buscar(text, text, int, text[]) to anon;
grant execute on function public.sm_normas_lista(text) to anon;
