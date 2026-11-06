-- Senhor Multas · schema de produção (Supabase / PostgreSQL) — cap. 11 do descritivo
-- Isolamento por cliente e parceiro via RLS. Dados pessoais sensíveis criptografados em repouso (pgsodium/Vault).

create extension if not exists vector;
create extension if not exists pgcrypto;

create type perfil as enum ('cliente','cliente_empresa','parceiro','qualidade','admin');
create type fase as enum ('defesa_previa','jari','cetran','indicacao_condutor');
create type status_defesa as enum ('em_analise','fora_do_escopo','aguardando_pagamento','aguardando_documentos','em_preparacao','aguardando_validacao','pronta_para_protocolar','protocolada','deferida','indeferida');

create table parceiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('ECV','despachante','frota','loja')),
  comissao_pct numeric(5,2) not null default 0,
  asaas_wallet_id text,
  slug_link text unique not null,
  white_label jsonb,
  status text not null default 'onboarding',
  criado_em timestamptz not null default now()
);

create table planos (
  id text primary key,
  nome text not null,
  creditos int,
  preco numeric(10,2),
  validade_meses int,
  ativo boolean not null default true
);

create table empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  cnpj text unique not null,
  plano_id text references planos(id),
  franquia_mensal int,
  white_label boolean default false
);

create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  perfil perfil not null default 'cliente',
  nome text not null,
  cpf_cnpj text not null,          -- criptografar (Vault) em produção
  email text not null,
  telefone text,
  parceiro_id uuid references parceiros(id),
  empresa_id uuid references empresas(id),
  asaas_customer_id text,
  criado_em timestamptz not null default now()
);

create table veiculos (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references usuarios(id) on delete cascade,
  placa text not null,
  renavam text,
  condutor_principal text,
  unique (dono_id, placa)
);

create table multas (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references usuarios(id) on delete cascade,
  veiculo_id uuid references veiculos(id),
  numero_auto text not null,
  orgao text not null,
  esfera text,
  tipo text not null,
  data_infracao timestamptz,
  data_expedicao date,
  enquadramento text,
  campos jsonb not null default '{}',     -- demais campos extraídos
  confianca jsonb not null default '{}',  -- confiança por campo
  fase fase not null,
  prazo date,
  origem text not null default 'upload',  -- upload | monitoramento | whatsapp
  escopo text not null default 'automatizado',
  arquivo_path text,                       -- Supabase Storage (bucket privado)
  criado_em timestamptz not null default now()
);

create table defesas (
  id uuid primary key default gen_random_uuid(),
  multa_id uuid not null references multas(id) on delete cascade,
  fase fase not null,
  status status_defesa not null default 'em_analise',
  checklist jsonb not null default '[]',
  estimativa_exito jsonb,
  modo text check (modo in ('completo','conservador')),
  credito_consumido boolean not null default false,
  validada_cliente_em timestamptz,
  assinada_em timestamptz,
  protocolo text,
  versao int not null default 0,
  criado_em timestamptz not null default now()
);

create table defesa_versoes (
  id uuid primary key default gen_random_uuid(),
  defesa_id uuid not null references defesas(id) on delete cascade,
  versao int not null,
  conteudo jsonb not null,
  modelo_ia text not null,
  versao_prompt text not null,
  versao_regras text not null,
  gerada_em timestamptz not null default now(),
  unique (defesa_id, versao)
);

create table normas (
  id text primary key,
  urn text not null,
  tipo text not null,
  numero text,
  artigo text,
  trecho text,
  texto text not null,
  hash text not null,
  fonte_oficial_url text not null,
  repo_commit text,
  embedding vector(1024),
  sincronizada_em timestamptz not null default now()
);
create index on normas using hnsw (embedding vector_cosine_ops);

create table fontes (
  id text primary key,
  tipo text not null check (tipo in ('norma','jurisprudencia','decisao_propria')),
  origem text not null,
  url text not null,
  texto_original text not null,
  hash text not null,
  coletada_em timestamptz not null default now()
);

create table citacoes (
  id uuid primary key default gen_random_uuid(),
  defesa_versao_id uuid not null references defesa_versoes(id) on delete cascade,
  fonte_id text not null,
  trecho text,
  status_trava text not null check (status_trava in ('confirmada','removida')),
  motivo text,
  verificada_em timestamptz not null default now()
);

create table regras_nulidade (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  descricao text not null,
  normas_ids text[] not null default '{}',
  versao text not null,
  ativa boolean not null default true,
  revisar_por_mudanca boolean not null default false,
  assinada_por text,  -- especialista responsável
  unique (codigo, versao)
);

create table validacoes_cliente (
  id uuid primary key default gen_random_uuid(),
  defesa_id uuid not null references defesas(id) on delete cascade,
  fatos_confirmados jsonb not null,
  declaracoes jsonb not null,
  ajustes_pedidos jsonb not null default '[]',
  ip inet,
  data timestamptz not null default now()
);

create table auditoria_amostral (
  id uuid primary key default gen_random_uuid(),
  defesa_id uuid not null references defesas(id),
  auditor_id uuid references usuarios(id),
  resultado text,
  observacoes text,
  data timestamptz not null default now()
);

create table resultados (
  id uuid primary key default gen_random_uuid(),
  defesa_id uuid not null references defesas(id),
  decisao text not null check (decisao in ('deferida','indeferida')),
  data date not null,
  argumentos_usados text[] not null default '{}'
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id),
  plano_id text not null references planos(id),
  valor numeric(10,2) not null,
  creditos int not null,
  metodo text not null,
  parceiro_id uuid references parceiros(id),
  asaas_payment_id text unique,
  status text not null default 'aguardando_pagamento',
  criado_em timestamptz not null default now(),
  pago_em timestamptz
);

create table carteira_creditos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id),
  pedido_id uuid references pedidos(id),
  defesa_id uuid references defesas(id),
  quantidade int not null,
  descricao text,
  validade timestamptz,
  data timestamptz not null default now(),
  unique (defesa_id)  -- uma multa consome no máximo 1 crédito
);

create table eventos_asaas (
  id text primary key,          -- id do evento => idempotência
  evento text not null,
  payload jsonb not null,
  recebido_em timestamptz not null default now(),
  processado boolean not null default false
);

create table prazos (
  id uuid primary key default gen_random_uuid(),
  defesa_id uuid not null references defesas(id) on delete cascade,
  tipo text not null,
  vencimento date not null,
  alerta_enviado boolean not null default false
);

create table auditoria (
  id bigserial primary key,
  usuario_id uuid,
  acao text not null,
  entidade text not null,
  antes jsonb,
  depois jsonb,
  data timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS
create or replace function meu_perfil() returns perfil language sql stable security definer as
$$ select perfil from usuarios where id = auth.uid() $$;
create or replace function e_interno() returns boolean language sql stable as
$$ select meu_perfil() in ('qualidade','admin') $$;

alter table usuarios enable row level security;
alter table veiculos enable row level security;
alter table multas enable row level security;
alter table defesas enable row level security;
alter table defesa_versoes enable row level security;
alter table citacoes enable row level security;
alter table validacoes_cliente enable row level security;
alter table pedidos enable row level security;
alter table carteira_creditos enable row level security;

create policy usuario_proprio on usuarios for select using (id = auth.uid() or e_interno()
  or (meu_perfil() = 'parceiro' and parceiro_id = (select parceiro_id from usuarios where id = auth.uid())));
create policy veiculos_dono on veiculos for all using (dono_id = auth.uid() or e_interno());
create policy multas_dono on multas for all using (dono_id = auth.uid() or e_interno());
create policy defesas_dono on defesas for select using (e_interno() or exists (select 1 from multas m where m.id = multa_id and m.dono_id = auth.uid()));
create policy versoes_dono on defesa_versoes for select using (e_interno() or exists (select 1 from defesas d join multas m on m.id = d.multa_id where d.id = defesa_id and m.dono_id = auth.uid()));
create policy citacoes_dono on citacoes for select using (e_interno() or exists (select 1 from defesa_versoes v join defesas d on d.id = v.defesa_id join multas m on m.id = d.multa_id where v.id = defesa_versao_id and m.dono_id = auth.uid()));
create policy validacoes_dono on validacoes_cliente for select using (e_interno() or exists (select 1 from defesas d join multas m on m.id = d.multa_id where d.id = defesa_id and m.dono_id = auth.uid()));
create policy pedidos_dono on pedidos for select using (usuario_id = auth.uid() or e_interno());
create policy carteira_dono on carteira_creditos for select using (usuario_id = auth.uid() or e_interno());
-- Escritas em defesas, versões, citações, carteira e pedidos acontecem apenas no servidor (service role).
