import type { Citacao } from "@/lib/types";
import type { BlocosPeca } from "@/lib/peca-formato";

const RE = /\[\[(fato|fonte):([^\]]+)\]\]/g;

export function Paragrafo({ texto, citacoes, plain }: { texto: string; citacoes: Citacao[]; plain?: boolean }) {
  const confirmadas = citacoes.filter((c) => c.status_trava === "confirmada");
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of texto.matchAll(RE)) {
    out.push(texto.slice(last, m.index));
    if (m[1] === "fato") out.push(<span key={k++} className={plain ? "" : "mk-fato"}>{m[2]}</span>);
    else {
      const [id, t] = m[2].split("|");
      const n = confirmadas.findIndex((c) => c.fonte_id === id) + 1;
      out.push(
        <span key={k++} className={plain ? "" : "mk-fonte"}>
          {t}
          <sup className={plain ? "text-[9px]" : "ml-0.5 font-semibold text-ok"}>{plain ? ` (${n})` : ` [Fonte ${n} ✓]`}</sup>
        </span>,
      );
    }
    last = (m.index ?? 0) + m[0].length;
  }
  out.push(texto.slice(last));
  return <>{out}</>;
}

/** Peça no padrão de petição administrativa (Verdana, justificado, seções numeradas). */
export function Peca({ b, citacoes, plain }: { b: BlocosPeca; citacoes: Citacao[]; plain?: boolean }) {
  return (
    <article className="peca text-[13px] leading-[1.7] text-[#1b1b1b]" style={{ fontFamily: "Verdana, Geneva, 'DejaVu Sans', sans-serif" }}>
      <header className="mb-8 font-bold uppercase leading-snug tracking-wide">
        {b.enderecamento.map((l) => <div key={l}>{l}</div>)}
      </header>

      <table className="mb-8 w-full border-collapse text-[11.5px]">
        <tbody>
          {b.referencias.map(([k, v]) => (
            <tr key={k} className="border border-black/25">
              <td className="w-[34%] bg-black/[.04] px-3 py-1.5 font-bold">{k}</td>
              <td className="px-3 py-1.5">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mb-4 indent-12 text-justify">
        <Paragrafo texto={b.qualificacao} citacoes={citacoes} plain={plain} />
      </p>
      <h1 className="my-5 text-center text-[15px] font-bold tracking-[0.12em]">{b.titulo}</h1>
      <p className="mb-6 text-justify">{b.abertura}</p>

      {b.secoes.map((s) => (
        <section key={s.titulo} className="mb-5 break-inside-avoid-page">
          <h2 className="mb-2.5 text-[13px] font-bold">{s.titulo}</h2>
          {s.titulo.endsWith("DOS PEDIDOS") ? (
            <>
              <p className="mb-2 indent-12 text-justify">Diante do exposto, requer:</p>
              <ol className="space-y-1.5 pl-12">
                {b.pedidos.map((p, i) => (
                  <li key={i} className="text-justify" style={{ listStyle: "none" }}>
                    <span className="mr-2 font-bold">{String.fromCharCode(97 + i)})</span>
                    {p}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            s.paragrafos.map((p, i) => (
              <p key={i} className="mb-2.5 indent-12 text-justify">
                <Paragrafo texto={p} citacoes={citacoes} plain={plain} />
              </p>
            ))
          )}
        </section>
      ))}

      <p className="mt-8 indent-12">{b.fechamento}</p>
      <p className="mt-6 text-right">{b.localData}</p>

      <div className="mx-auto mt-14 w-[70%] text-center">
        <div className="border-t border-black/70 pt-1.5 font-bold">{b.assinatura.nome}</div>
        <div className="text-[11.5px]">{b.assinatura.documento}</div>
        {b.assinatura.carimbo && <div className="mt-1.5 text-[10px] text-black/60">{b.assinatura.carimbo}</div>}
      </div>

      <section className="mt-10 break-inside-avoid-page text-[11.5px]">
        <h2 className="mb-1.5 font-bold">DOCUMENTOS ANEXOS</h2>
        <ol className="list-decimal space-y-0.5 pl-6">{b.anexos.map((a) => <li key={a}>{a}</li>)}</ol>
      </section>

      {b.fundamentos.length > 0 && (
        <section className="mt-6 break-inside-avoid-page border-t border-black/15 pt-3 text-[10.5px] text-black/70">
          <h2 className="mb-1 font-bold">FUNDAMENTOS CONFERIDOS NA BASE (LEGISLAÇÃO VIGENTE E JURISPRUDÊNCIA)</h2>
          {b.fundamentos.map((f) => <div key={f}>{f}</div>)}
        </section>
      )}
    </article>
  );
}

export type DadosComprovante = {
  protocolo: string;
  assinadaEm: string;
  geradaEm: string;
  titulo: string;
  orgao: string;
  placa: string;
  auto: string;
  requerente: string;
  documento: string;
  versao: number;
  modelo: string;
  regras: string;
  ip: string;
  hash: string;
  declaracoes: string[];
  fontes: string[];
  anexos: { nome: string; sha256: string }[];
  url: string;
  qrSvg: string;
};

const fmt = (s: string) => new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" });

/** Comprovante de Protocolo Senhor Multas (anexo à peça). */
export function Comprovante({ c }: { c: DadosComprovante }) {
  const linhas: [string, string][] = [
    ["Protocolo", c.protocolo],
    ["Peça", `${c.titulo} · versão ${c.versao}`],
    ["Requerente", `${c.requerente} · ${c.documento}`],
    ["Multa", `Auto ${c.auto} · Placa ${c.placa} · ${c.orgao}`],
    ["Gerada em", fmt(c.geradaEm)],
    ["Assinada eletronicamente em", `${fmt(c.assinadaEm)} (horário de Brasília)`],
    ["IP da assinatura", c.ip],
    ["Rastreabilidade", `modelo ${c.modelo} · ${c.regras}`],
  ];
  return (
    <article className="text-[11px] leading-snug text-[#1b1b1b]" style={{ fontFamily: "Verdana, Geneva, 'DejaVu Sans', sans-serif" }}>
      <div className="flex items-start justify-between gap-6 border-b-2 border-[#13294b] pb-4">
        <div>
          <div className="text-[20px] font-black leading-none"><span className="text-[#13294b]">Senhor</span> <span className="text-[#c99700]">Multas</span></div>
          <h1 className="mt-3 text-[15px] font-bold tracking-wide text-[#13294b]">COMPROVANTE DE PROTOCOLO</h1>
          <div className="mt-1 font-mono text-[18px] font-bold text-[#13294b]">{c.protocolo}</div>
        </div>
        <div className="text-center">
          <div className="size-[110px]" dangerouslySetInnerHTML={{ __html: c.qrSvg }} />
          <div className="mt-1 text-[8.5px] text-black/60">Verifique a autenticidade</div>
        </div>
      </div>
      <table className="mt-4 w-full border-collapse">
        <tbody>
          {linhas.map(([k, v]) => (
            <tr key={k} className="border-b border-black/10">
              <td className="w-[34%] py-1 pr-3 align-top font-bold">{k}</td>
              <td className="py-1">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="mt-4 font-bold">Impressão digital da peça (SHA-256)</h2>
      <div className="mt-1 break-all rounded bg-black/[.04] p-2 font-mono text-[10.5px]">{c.hash}</div>
      <h2 className="mt-4 font-bold">Declarações confirmadas pelo requerente</h2>
      <ul className="mt-1 list-disc pl-5">{c.declaracoes.map((d) => <li key={d}>{d}</li>)}</ul>
      {c.anexos.length > 0 && (
        <>
          <h2 className="mt-4 font-bold">Documentos enviados</h2>
          <table className="mt-1 w-full border-collapse text-[10.5px]">
            <tbody>{c.anexos.map((a) => <tr key={a.sha256} className="border-b border-black/10"><td className="py-1 pr-3">{a.nome}</td><td className="py-1 font-mono text-black/60">sha256 {a.sha256.slice(0, 24)}…</td></tr>)}</tbody>
          </table>
        </>
      )}
      {c.fontes.length > 0 && (
        <>
          <h2 className="mt-4 font-bold">Fundamentos conferidos na base de leis</h2>
          <ul className="mt-1 list-disc pl-5 text-[11px]">{c.fontes.map((f) => <li key={f}>{f}</li>)}</ul>
        </>
      )}
      <p className="mt-4 border-t border-black/10 pt-2 text-[9px] text-black/60">
        Peça elaborada com auxílio de inteligência artificial, com citações conferidas automaticamente no texto vigente da legislação, e conferida e assinada eletronicamente pelo próprio requerente. Este comprovante registra a geração e a assinatura no Senhor Multas; ele não substitui o protocolo no órgão de trânsito. Autenticidade: {c.url}
      </p>
    </article>
  );
}
