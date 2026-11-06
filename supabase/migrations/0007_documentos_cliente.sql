-- Documentos enviados pelo cliente (CNH, CRLV, procuração, provas). Conteúdo criptografado pela aplicação (AES-256-GCM).
-- Aplicada no projeto em 06/11/2026 (migração "documentos_cliente"): tabela sm_arquivos + funções
-- sm_arquivo_gravar, sm_arquivo_listar (sem conteúdo), sm_arquivo_obter, sm_arquivo_apagar, sm_arquivo_apagar_titular,
-- todas exigindo o segredo do servidor; nenhum acesso direto de anon/authenticated à tabela.
create table if not exists public.sm_arquivos (
  id text primary key, dono_id text not null, defesa_id text not null, tipo text not null, nome text not null,
  mime text not null, tamanho int not null, sha256 text not null, conteudo text not null, criado_em timestamptz not null default now()
);
create index if not exists sm_arquivos_defesa on public.sm_arquivos (defesa_id);
create index if not exists sm_arquivos_dono on public.sm_arquivos (dono_id);
alter table public.sm_arquivos enable row level security;
revoke all on public.sm_arquivos from anon, authenticated;
