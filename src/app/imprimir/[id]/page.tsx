import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/session";
import { Peca } from "@/components/Peca";
import { AutoPrint } from "./AutoPrint";

export const dynamic = "force-dynamic";

/** Versão para impressão / "Salvar como PDF" em Verdana. */
export default async function Imprimir({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioAtual();
  const defesa = db().defesas.find((x) => x.id === id && x.dono_id === u.id);
  const v = defesa?.versoes.at(-1);
  if (!defesa || !v) notFound();
  const confirmadas = v.citacoes.filter((c) => c.status_trava === "confirmada");
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-[780px] px-12 py-14">
        <Peca peca={v.conteudo} citacoes={v.citacoes} cliente={u} plain />
        <div className="mt-12 text-center text-[13px]" style={{ fontFamily: "Verdana" }}>
          {defesa.assinada_em ? <>Assinado eletronicamente por {u.nome} em {new Date(defesa.assinada_em).toLocaleString("pt-BR")}</> : "____________________________________"}
          <div>{u.nome}</div>
        </div>
        {confirmadas.length > 0 && (
          <div className="mt-10 border-t pt-4 text-[11px]" style={{ fontFamily: "Verdana" }}>
            <b>FUNDAMENTOS CONFERIDOS NA FONTE OFICIAL</b>
            {confirmadas.map((c, i) => <div key={c.id}>Fonte {i + 1}: {c.rotulo}</div>)}
          </div>
        )}
      </div>
      <AutoPrint />
    </div>
  );
}
