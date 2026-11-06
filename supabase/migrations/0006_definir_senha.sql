-- Redefinição de senha pelo link enviado por e-mail (o servidor valida o token antes de chamar)
create or replace function public.sm_definir_senha(p_segredo text, p_usuario uuid, p_senha text)
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  perform sm_checar(p_segredo);
  if length(coalesce(p_senha, '')) < 10 then raise exception 'senha_curta'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf')), updated_at = now() where id = p_usuario;
  if not found then raise exception 'usuario_inexistente'; end if;
  -- encerra as sessões abertas: quem tinha a senha antiga precisa entrar de novo
  delete from auth.sessions where user_id = p_usuario;
  delete from auth.refresh_tokens where user_id = p_usuario::text;
end $$;
revoke all on function public.sm_definir_senha(text, uuid, text) from public, authenticated;
grant execute on function public.sm_definir_senha(text, uuid, text) to anon;
