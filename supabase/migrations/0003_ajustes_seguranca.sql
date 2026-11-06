-- Aceita mais de um segredo de servidor (ex.: local e Vercel), cada um guardado só como hash.
create or replace function public.sm_checar(p_segredo text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_segredo is null or not exists (
    select 1 from sm_config where chave like 'segredo_hash%' and valor = encode(extensions.digest(p_segredo, 'sha256'), 'hex')
  ) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
end $$;
revoke all on function public.sm_checar(text) from public, anon, authenticated;

-- Usuários logados nunca chamam estas funções (só o servidor, com o segredo).
revoke execute on function public.sm_carregar(text) from authenticated;
revoke execute on function public.sm_gravar(text, jsonb, jsonb) from authenticated;
revoke execute on function public.sm_apagar_tudo(text) from authenticated;
revoke execute on function public.sm_criar_usuario(text, text, text) from authenticated;
