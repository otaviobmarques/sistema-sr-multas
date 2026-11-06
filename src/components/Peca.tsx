import type { Citacao, ConteudoPeca } from "@/lib/types";

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
          <sup className={plain ? "" : "ml-0.5 font-semibold text-ok"}> [Fonte {n} ✓]</sup>
        </span>,
      );
    }
    last = (m.index ?? 0) + m[0].length;
  }
  out.push(texto.slice(last));
  return <>{out}</>;
}

export function Peca({ peca, citacoes, cliente, plain }: { peca: ConteudoPeca; citacoes: Citacao[]; cliente: { nome: string; cpf_cnpj: string }; plain?: boolean }) {
  return (
    <article className="space-y-4 text-[13.5px] leading-[1.75]" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
      <h2 className="text-center text-[15px] font-bold tracking-wide">{peca.titulo}</h2>
      <p>{peca.enderecamento}</p>
      <p className="text-justify">
        {cliente.nome}, CPF/CNPJ {cliente.cpf_cnpj}, vem, respeitosamente, apresentar a presente peça pelos fatos e fundamentos a seguir.
      </p>
      {peca.secoes.map((s) => (
        <section key={s.titulo} className="space-y-2">
          <h3 className="font-bold">{s.titulo}</h3>
          {s.paragrafos.map((p, i) => (
            <p key={i} className="text-justify">
              <Paragrafo texto={p} citacoes={citacoes} plain={plain} />
            </p>
          ))}
        </section>
      ))}
      <section className="space-y-1">
        <h3 className="font-bold">DOS PEDIDOS</h3>
        {peca.pedidos.map((p, i) => (
          <p key={i}>{String.fromCharCode(97 + i)}) {p}</p>
        ))}
      </section>
      <p>{peca.fechamento}</p>
    </article>
  );
}
