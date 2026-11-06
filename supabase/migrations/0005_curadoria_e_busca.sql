-- Busca com OU + ranking; validação da curadoria pelo especialista; consulta de trechos.
alter table public.normas add column if not exists validada_por text;
alter table public.normas add column if not exists validada_em timestamptz;

create or replace function public.sm_normas_buscar(p_segredo text, p_consulta text, p_limite integer default 12, p_normas text[] default null)
returns table(id text, norma_id text, rotulo text, nivel text, texto text, contexto text, revogado boolean, hash text, fonte_oficial_url text, origem text, relevancia real)
language plpgsql security definer set search_path to 'public' as $function$
declare q tsquery;
begin
  perform sm_checar(p_segredo);
  -- termos combinados com OU; a relevância (ts_rank_cd) favorece trechos com mais termos e mais próximos
  q := nullif(replace(plainto_tsquery('portuguese', p_consulta)::text, ' & ', ' | '), '')::tsquery;
  if q is null then return; end if;
  return query select t.id, t.norma_id, t.rotulo, t.nivel, t.texto, t.contexto, t.revogado, t.hash, n.fonte_oficial_url, n.origem,
    (ts_rank_cd(t.busca, q, 32) * case when t.norma_id = 'ctb' then 1.3 else 1 end)::real as relevancia
  from normas_trechos t join normas n on n.id = t.norma_id
  where t.busca @@ q and not t.revogado and t.nivel <> 'artigo' and (p_normas is null or t.norma_id = any(p_normas))
  order by relevancia desc, t.ordem limit least(greatest(p_limite, 1), 50);
end $function$;

drop function if exists public.sm_normas_obter(text, text[]);
create function public.sm_normas_obter(p_segredo text, p_ids text[])
returns table(id text, norma_id text, urn text, rotulo text, nivel text, artigo text, texto text, contexto text, nota text, revogado boolean, hash text,
  fonte_oficial_url text, origem text, repo_commit text, validada_em timestamptz, sincronizado_em timestamptz)
language plpgsql security definer set search_path to 'public' as $function$
begin
  perform sm_checar(p_segredo);
  return query select t.id, t.norma_id, t.urn, t.rotulo, t.nivel, t.artigo, t.texto, t.contexto, t.nota, t.revogado, t.hash,
    n.fonte_oficial_url, n.origem, n.repo_commit, n.validada_em, t.sincronizado_em
  from normas_trechos t join normas n on n.id = t.norma_id where t.id = any(p_ids);
end $function$;

drop function if exists public.sm_normas_lista(text);
create function public.sm_normas_lista(p_segredo text)
returns table(id text, sigla text, titulo text, tipo text, data date, origem text, repo_path text, repo_commit text, git_sha text, trechos integer, revogada boolean,
  fonte_oficial_url text, versao_texto text, validada_por text, validada_em timestamptz, sincronizada_em timestamptz)
language plpgsql security definer set search_path to 'public' as $function$
begin
  perform sm_checar(p_segredo);
  return query select n.id, n.sigla, n.titulo, n.tipo, n.data, n.origem, n.repo_path, n.repo_commit, n.git_sha, n.trechos, n.revogada,
    n.fonte_oficial_url, n.versao_texto, n.validada_por, n.validada_em, n.sincronizada_em from normas n order by n.origem desc, n.data desc nulls last;
end $function$;

create or replace function public.sm_normas_validar(p_segredo text, p_norma_id text, p_por text)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  perform sm_checar(p_segredo);
  update normas set validada_por = nullif(p_por, ''), validada_em = case when nullif(p_por, '') is null then null else now() end where id = p_norma_id;
end $function$;

create or replace function public.sm_normas_trechos(p_segredo text, p_norma_id text)
returns table(id text, rotulo text, nivel text, texto text, nota text, revogado boolean, hash text)
language plpgsql security definer set search_path to 'public' as $function$
begin
  perform sm_checar(p_segredo);
  return query select t.id, t.rotulo, t.nivel, t.texto, t.nota, t.revogado, t.hash from normas_trechos t where t.norma_id = p_norma_id and t.nivel <> 'artigo' order by t.ordem;
end $function$;

revoke all on function public.sm_normas_buscar(text, text, int, text[]) from public, authenticated;
revoke all on function public.sm_normas_obter(text, text[]) from public, authenticated;
revoke all on function public.sm_normas_lista(text) from public, authenticated;
revoke all on function public.sm_normas_validar(text, text, text) from public, authenticated;
revoke all on function public.sm_normas_trechos(text, text) from public, authenticated;
grant execute on function public.sm_normas_buscar(text, text, int, text[]) to anon;
grant execute on function public.sm_normas_obter(text, text[]) to anon;
grant execute on function public.sm_normas_lista(text) to anon;
grant execute on function public.sm_normas_validar(text, text, text) to anon;
grant execute on function public.sm_normas_trechos(text, text) to anon;
