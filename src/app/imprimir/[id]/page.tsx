import { notFound } from "next/navigation";
import { audit, db, save } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";
import { Comprovante, Peca } from "@/components/Peca";
import { dadosDocumento } from "@/lib/comprovante";
import { AutoPrint } from "./AutoPrint";

export const dynamic = "force-dynamic";

/** Peça + Comprovante de Protocolo, em A4 (margens ABNT), para "Salvar como PDF". */
export default async function Imprimir({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await exigirUsuario();
  const d = db();
  const defesa = d.defesas.find((x) => x.id === id && (x.dono_id === u.id || u.perfil === "admin"));
  if (!defesa?.versoes.length) notFound();
  const multa = d.multas.find((m) => m.id === defesa.multa_id)!;
  const cliente = d.usuarios.find((x) => x.id === defesa.dono_id) ?? u;
  const { blocos, comprovante, versao } = await dadosDocumento(defesa, multa, cliente);
  if (defesa.dono_id !== u.id) {
    audit(u.id, "defesa_baixada_admin", `defesa:${defesa.id}`, "pdf");
    await save();
  }
  return (
    <div className="min-h-screen bg-[#e9e7e2] py-8 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 30mm 20mm 20mm 30mm; }
        @media print { .folha { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; min-height: 0 !important; } .quebra { break-before: page; } }
      `}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-2 text-sm text-black/70">
        <span>{blocos.titulo} · versão {versao.versao}{defesa.protocolo_sm ? ` · ${defesa.protocolo_sm}` : " · ainda não assinada"}</span>
        <span>Use “Salvar como PDF” na janela de impressão</span>
      </div>
      <div className="folha mx-auto w-[210mm] min-h-[297mm] bg-white px-[20mm] pb-[20mm] pl-[30mm] pt-[30mm] shadow-xl">
        <Peca b={blocos} citacoes={versao.citacoes} plain />
        <div className="mt-10 border-t border-black/15 pt-2 text-center text-[9px] text-black/50">{blocos.rodape}</div>
      </div>
      {comprovante && (
        <div className="folha quebra mx-auto mt-8 w-[210mm] min-h-[297mm] bg-white px-[20mm] pb-[20mm] pl-[30mm] pt-[30mm] shadow-xl">
          <Comprovante c={comprovante} />
        </div>
      )}
      <AutoPrint />
    </div>
  );
}
