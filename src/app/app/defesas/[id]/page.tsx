import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/session";
import { DefesaView } from "./DefesaView";

export default async function DefesaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await usuarioAtual();
  const d = db();
  const defesa = d.defesas.find((x) => x.id === id && x.dono_id === u.id);
  if (!defesa) notFound();
  if (!defesa.versoes.length) redirect(`/app/nova?defesa=${defesa.id}`);
  const multa = d.multas.find((m) => m.id === defesa.multa_id)!;
  return <DefesaView defesa={defesa} multa={multa} cliente={{ nome: u.nome, cpf_cnpj: u.cpf_cnpj }} />;
}
