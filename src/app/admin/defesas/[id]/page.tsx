import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download, ExternalLink, FileText, Printer } from "lucide-react";
import { exigirAdmin } from "@/lib/session";
import { audit, db, save, supabaseAtivo } from "@/lib/db";
import { dadosDocumento } from "@/lib/comprovante";
import { DOCS, idsDaCadeia, listarArquivos } from "@/lib/documentos";
import { dataBR, horaBR } from "@/lib/peca-formato";
import { Peca } from "@/components/Peca";
import { Badge, Card, CardTitle, PageHeader, RESULTADO, STATUS, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DefesaAdmin({ params }: { params: Promise<{ id: string }> }) {
  const eu = await exigirAdmin();
  if (eu.perfil !== "admin") redirect("/admin");
  const { id } = await params;
  const d = db();
  const defesa = d.defesas.find((x) => x.id === id);
  if (!defesa) notFound();
  const multa = d.multas.find((m) => m.id === defesa.multa_id)!;
  const cliente = d.usuarios.find((u) => u.id === defesa.dono_id);
  const doc = defesa.versoes.length && cliente ? await dadosDocumento(defesa, multa, cliente) : null;
  const arquivos = supabaseAtivo() ? await listarArquivos(idsDaCadeia(d, defesa)) : [];
  const cadeia = [defesa.fase_anterior_id, defesa.proxima_fase_id].filter(Boolean).map((i) => d.defesas.find((x) => x.id === i)).filter(Boolean);
  // LGPD: acesso do administrador a dados do cliente fica registrado
  if (defesa.dono_id !== eu.id) {
    audit(eu.id, "defesa_acessada_admin", `defesa:${defesa.id}`, cliente?.nome);
    await save();
  }
  const dados: [string, string][] = [
    ["Placa", multa.placa],
    ["Auto", multa.numero_auto || "—"],
    ["Órgão", `${multa.orgao} (${multa.esfera})`],
    ["Enquadramento", multa.enquadramento || multa.descricao],
    ["Local", multa.local],
    ["Infração", `${dataBR(multa.data_infracao)} às ${horaBR(multa.data_infracao)}`],
    ["Expedição", dataBR(multa.data_expedicao)],
    ["Prazo", dataBR(multa.prazo)],
    ["Equipamento", multa.agente_ou_equipamento ?? "—"],
    ["Remetente", multa.remetente?.situacao === "terceiro" ? "Terceiro (não é o titular)" : multa.remetente?.situacao === "titular" ? "Titular" : "Não identificado"],
  ];

  return (
    <div>
      <PageHeader
        title={`Defesa · ${multa.placa}`}
        subtitle={<span>{cliente ? <Link href={`/admin/defesas?cliente=${cliente.id}`} className="text-brand hover:underline">{cliente.nome}</Link> : "—"} · {cliente?.email} · {cliente?.cpf_cnpj}</span>}
        actions={
          doc ? (
            <div className="flex flex-wrap gap-2">
              <a href={`/imprimir/${defesa.id}`} target="_blank" className="btn btn-primary"><Printer className="size-4" /> PDF</a>
              <a href={`/api/defesas/${defesa.id}/docx`} className="btn btn-ghost"><Download className="size-4" /> DOCX</a>
            </div>
          ) : undefined
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {doc ? (
            <div className="overflow-x-auto rounded-2xl bg-white p-6 sm:p-10">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-black/60">
                <span>Versão {doc.versao.versao} de {defesa.versoes.length}</span>·<span>gerada em {new Date(doc.versao.gerada_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>·<span>{doc.versao.modelo_ia}</span>
              </div>
              <Peca b={doc.blocos} citacoes={doc.versao.citacoes} />
            </div>
          ) : (
            <Card><p className="text-sm text-ink-400">A peça ainda não foi gerada. O cliente está na etapa: <b className="text-white">{STATUS[defesa.status].rotulo}</b>.</p></Card>
          )}
          {defesa.versoes.length > 0 && (
            <Card>
              <CardTitle>Citações e trava (última versão)</CardTitle>
              <div className="divide-y divide-white/5 text-sm">
                {defesa.versoes.at(-1)!.citacoes.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3 py-2"><span className="text-ink-200">{c.rotulo}{c.motivo && <span className="block text-xs text-ink-400">{c.motivo}</span>}</span><Badge tone={c.status_trava === "confirmada" ? "ok" : "bad"}>{c.status_trava}</Badge></div>
                ))}
              </div>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardTitle extra={<StatusBadge status={defesa.status} />}>Situação</CardTitle>
            <div className="space-y-1.5 text-sm text-ink-300">
              <div>Modo: <b className="text-white">{defesa.modo ?? "—"}</b> · crédito {defesa.credito_consumido ? "consumido" : "não consumido"}</div>
              {defesa.assinada_em && <div>Assinada em {dataBR(defesa.assinada_em)} às {horaBR(defesa.assinada_em)} · IP {defesa.validacao?.ip ?? "—"}</div>}
              {defesa.protocolo_sm && <div>Protocolo SM: <a href={`/verificar/${defesa.protocolo_sm}`} target="_blank" className="font-mono text-brand hover:underline">{defesa.protocolo_sm} <ExternalLink className="inline size-3" /></a></div>}
              {defesa.protocolo && <div>Protocolo no órgão: <span className="font-mono text-white">{defesa.protocolo}</span></div>}
              {defesa.resultado && <div>Resultado: <Badge tone={defesa.resultado === "deferida" ? "ok" : "bad"}>{defesa.resultado}</Badge></div>}
              {cadeia.map((c) => <div key={c!.id}><Link href={`/admin/defesas/${c!.id}`} className="text-brand hover:underline">{c!.id === defesa.fase_anterior_id ? "← fase anterior" : "próxima fase →"} ({c!.fase})</Link></div>)}
            </div>
          </Card>
          <Card>
            <CardTitle>Documentos enviados</CardTitle>
            {arquivos.length === 0 && <p className="text-sm text-ink-400">Nenhum documento enviado.</p>}
            <div className="divide-y divide-white/5 text-sm">
              {arquivos.map((a) => (
                <a key={a.id} href={`/api/documentos/${a.id}`} target="_blank" className="flex items-center justify-between gap-3 py-2 hover:text-white">
                  <span className="flex min-w-0 items-center gap-2 text-ink-200"><FileText className="size-4 shrink-0 text-ink-400" /><span className="truncate">{DOCS[a.tipo]?.rotulo ?? a.tipo} · {a.nome}</span></span>
                  <span className="shrink-0 text-xs text-ink-400">{(a.tamanho / 1024).toFixed(0)} KB</span>
                </a>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle>Dados da multa</CardTitle>
            <dl className="space-y-1.5 text-sm">{dados.map(([k, v]) => <div key={k} className="grid grid-cols-[110px_1fr] gap-2"><dt className="text-ink-400">{k}</dt><dd className="text-ink-200">{v}</dd></div>)}</dl>
          </Card>
          <Card>
            <CardTitle>Checklist do motor</CardTitle>
            <div className="divide-y divide-white/5 text-sm">
              {defesa.checklist.map((c) => <div key={c.regra} className="flex items-start justify-between gap-3 py-2"><span className="text-ink-200"><span className="font-mono text-xs text-brand">{c.regra}</span> {c.titulo}<span className="block text-xs text-ink-400">{c.detalhe}</span></span><Badge tone={RESULTADO[c.resultado]?.tone ?? "neutral"}>{RESULTADO[c.resultado]?.rotulo ?? c.resultado}</Badge></div>)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
