"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MessageSquareText } from "lucide-react";

const LIMITE = 3000;
const EXEMPLOS = [
  "Eu não era o condutor; o carro estava com meu irmão.",
  "Parei por pane mecânica e liguei o pisca-alerta.",
  "Não havia placa de proibição visível no local.",
  "Paguei o estacionamento rotativo pelo app às 14h05.",
];

/** Campo "Conte o que aconteceu": salva sozinho e devolve o texto salvo. */
export function Relato({ defesaId, inicial, onSalvo, onMudar, compacto }: { defesaId: string; inicial: string; onSalvo?: (t: string) => void; onMudar?: (t: string) => void; compacto?: boolean }) {
  const [texto, setTexto] = useState(inicial);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");
  const salvo = useRef(inicial);
  const aviso = useRef(onSalvo);
  aviso.current = onSalvo;

  async function salvar(t = texto) {
    if (t.trim() === salvo.current.trim()) return true;
    setEstado("salvando");
    const r = await fetch(`/api/defesas/${defesaId}/relato`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ relato: t }) }).then((r) => r.json()).catch(() => null);
    if (!r?.ok) {
      setEstado("erro");
      return false;
    }
    salvo.current = r.relato;
    aviso.current?.(r.relato);
    setEstado("salvo");
    return true;
  }
  // salva 1,2 s depois de parar de digitar
  useEffect(() => {
    if (texto.trim() === salvo.current.trim()) return;
    const t = setTimeout(() => salvar(texto), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  return (
    <div>
      {!compacto && (
        <p className="mb-2 text-xs text-ink-400">
          Conte com suas palavras o que aconteceu: quem dirigia, por que parou ali, o que viu no local, se pagou, se havia sinalização. A IA usa o seu relato para montar a defesa, e cada fato aparece destacado para você conferir antes de assinar.
        </p>
      )}
      <textarea
        value={texto}
        onChange={(e) => { const t = e.target.value.slice(0, LIMITE); setTexto(t); onMudar?.(t); setEstado(""); }}
        onBlur={() => salvar()}
        className="input min-h-28 resize-y"
        placeholder={`Ex.: ${EXEMPLOS[0]}`}
        aria-label="Relato do que aconteceu"
      />
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-400">
        <span className="flex flex-wrap gap-1.5">
          {!texto && EXEMPLOS.slice(1).map((e) => <button key={e} type="button" onClick={() => { setTexto(e); onMudar?.(e); }} className="rounded-full border border-white/10 px-2 py-0.5 hover:border-white/25 hover:text-ink-200">{e}</button>)}
        </span>
        <span className="flex items-center gap-1.5">
          {estado === "salvando" && <><Loader2 className="size-3 animate-spin" /> salvando…</>}
          {estado === "salvo" && <><Check className="size-3 text-ok" /> salvo</>}
          {estado === "erro" && <span className="text-bad">não foi possível salvar</span>}
          <span className="font-mono">{texto.length}/{LIMITE}</span>
        </span>
      </div>
    </div>
  );
}

export const IconeRelato = MessageSquareText;
