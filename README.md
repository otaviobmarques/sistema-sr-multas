# Senhor Multas — MVP (Fase 1)

Plataforma de defesa de multas com IA: o cliente envia a notificação, o sistema extrai os dados, audita o auto por regras determinísticas, estima o êxito, gera a **Defesa Pronta** com fontes verificadas (trava automática), e o cliente valida, assina e protocola. Pagamento por créditos via Asaas.

## Em produção

- **Site:** https://sistema-sr-multas.vercel.app (Vercel, time REDBOX, região São Paulo `gru1`)
- **Banco e login:** Supabase `senhor-multas` (`sa-east-1`) — tabela `sm_registros` + Supabase Auth
- **Deploy automático:** todo push na branch `main` deste repositório publica uma nova versão.
- **Variáveis na Vercel:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SM_SERVER_SECRET`, `ANTHROPIC_API_KEY`, `ADMIN_EMAILS`, `ASAAS_ENV`, `ASAAS_WEBHOOK_TOKEN` (e `ASAAS_API_KEY` quando o Asaas for ativado).
- **Pagamento:** sem `ASAAS_API_KEY`, só administradores podem simular pagamentos (`SM_DEMO_PAGAMENTO=1` libera para todos, apenas em testes).
- **Novo segredo de servidor:** gere um valor aleatório, cadastre na Vercel e insira o SHA-256 dele em `sm_config` (chave `segredo_hash_<nome>`).

## Rodar

```bash
npm install
cp .env.example .env.local   # opcional: chaves da Claude e do Asaas
npm run dev                  # http://localhost:3000
```

Sem chaves, tudo funciona em **modo demonstração**: extração, redação e assistente simulados; checkout Asaas simulado com botão “Simular pagamento (webhook)”, que passa pelo mesmo processamento do webhook real. Os dados ficam em `.data/db.json` (botão ↺ na barra lateral restaura a demonstração).

- `npm test` — casos de teste do motor de nulidades
- `npm run build && npm start` — produção

## O que está implementado (jornada do cap. 3)

| Etapa | Onde |
|---|---|
| 1–2 Entrada e extração (Claude Sonnet 5.5, saída estruturada com confiança por campo; documento tratado como dado) | `src/lib/ai/extractor.ts`, `POST /api/multas` |
| 3 Classificador de escopo (suspensão/cassação/ilegível) | `src/lib/rules.ts` |
| 4 Motor de nulidades determinístico e versionado | `src/lib/rules.ts`, `scripts/test-rules.test.ts` |
| 5 Estimativa por jurimetria (só com amostra mínima) + recorrer x pagar com desconto | `rules.ts`, `/app/nova` |
| 6 Créditos (consumidos só ao confirmar a geração) e checkout Asaas (Pix/cartão/boleto, split de parceiro) | `src/lib/servico.ts`, `src/lib/asaas.ts`, `/api/checkout` |
| 8–10 Pesquisador → Redator → **Verificador (trava)**, modo conservador | `src/lib/ai/pipeline.ts` |
| 11–12 Validação dos fatos, ajustes à IA, assinatura, DOCX/PDF em Verdana | `/app/defesas/[id]`, `src/lib/docx.ts`, `/imprimir/[id]` |
| 13 Protocolo guiado | `/api/defesas/[id]/protocolar` |
| Webhook Asaas idempotente (pagamento, vencimento, estorno, chargeback) | `src/lib/pagamentos.ts`, `POST /api/webhooks/asaas` |
| Assistente Sr. Multas (Claude Haiku 5.5) com leitura de notificação no chat | `src/lib/ai/assistant.ts`, `/app/assistente` |
| Admin: visão geral, jurimetria, parceiros/links, financeiro, qualidade da IA, base de leis | `/admin/*` |
| Schema de produção com RLS | `supabase/migrations/0001_schema.sql` |

## Antes de produção (pontos do cap. 15)

1. **Regras e fontes jurídicas**: a base em `src/lib/normas.ts` é uma *amostra de demonstração*. Importar o ctresb/leis (CTB + CONTRAN), conferir com normas.leg.br e ter as regras do motor **assinadas por especialista em direito de trânsito**.
2. **Persistência e login**: já em Supabase (armazenamento simplificado `sm_registros` + Supabase Auth). Próximos passos: migrar para o schema normalizado (`0001_schema.sql`) ao crescer, ativar confirmação de e-mail (configurar SMTP e a URL do site no Supabase Auth) e 2FA para parceiros/qualidade/admin.
3. **Asaas**: configurar `ASAAS_API_KEY` (sandbox), cadastrar o webhook `https://SEU_DOMINIO/api/webhooks/asaas` com o token `ASAAS_WEBHOOK_TOKEN`, e conferir nomes de eventos/campos na documentação vigente.
4. **Pendentes das fases 2–4**: WhatsApp Business, assinatura eletrônica com provedor (DocuSeal), Escavador/STJ, sincronização diária da base, monitoramento de multas, protocolo online por órgão, NF automática.
5. Parecer jurídico sobre o modelo da operação, políticas de reembolso e termos de uso.
