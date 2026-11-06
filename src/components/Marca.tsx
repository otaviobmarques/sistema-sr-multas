/* Identidade visual do Senhor Multas: logo (multa rasgada) e mascotes, em SVG. */
import clsx from "clsx";

export const NAVY = "#13294b";
export const AMBAR = "#f2b705";
const CINZA = "#9aa5b4";
const PELE = "#f4c99b";

/** Ícone do logo: a multa rasgada em duas metades. */
export function IconeMulta({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 70 56" fill="none" className={className} style={style} aria-hidden="true">
      <g transform="rotate(-6 19 28)">
        <path d="M5 8 H33 L29 16 L34 23 L29 31 L33 38 L28 47 H5 Z" fill="#fff" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
        <path d="M5 8 H33 L30 16 H5 Z" fill={NAVY} stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
        <text x="11.5" y="14.6" fontFamily="var(--font-geist-sans), Arial Black, Arial, sans-serif" fontWeight="900" fontSize="7.4" fill={AMBAR} fontStyle="italic">MUL</text>
        <rect x="10" y="22" width="15" height="3.2" rx="1.6" fill={CINZA} />
        <rect x="10" y="28.5" width="18" height="3.2" rx="1.6" fill={CINZA} />
        <rect x="10" y="35" width="13" height="3.2" rx="1.6" fill={CINZA} />
      </g>
      <g transform="translate(1 2) rotate(10 50 28)">
        <path d="M36 8 H65 V47 H35 L40 38 L36 31 L41 23 L36 16 Z" fill="#fff" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
        <path d="M36 8 H65 V16 H39.5 Z" fill={NAVY} stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
        <text x="42" y="14.6" fontFamily="var(--font-geist-sans), Arial Black, Arial, sans-serif" fontWeight="900" fontSize="7.4" fill={AMBAR} fontStyle="italic">LTA</text>
        <rect x="43" y="22" width="16" height="3.2" rx="1.6" fill={CINZA} />
        <rect x="45" y="28.5" width="15" height="3.2" rx="1.6" fill={CINZA} />
        <rect x="44" y="35" width="11" height="3.2" rx="1.6" fill={CINZA} />
      </g>
    </svg>
  );
}

/**
 * Logo completo. `tema="escuro"` (padrão do sistema): "Senhor" em branco.
 * `tema="claro"`: cores originais (azul-marinho) para fundos claros e impressos.
 */
export function Logo({ size = 32, tema = "escuro", compacto = false }: { size?: number; tema?: "escuro" | "claro"; compacto?: boolean }) {
  return (
    <div className="flex items-center gap-2" aria-label="Senhor Multas">
      <IconeMulta style={{ height: size * 1.15, width: "auto" }} />
      {!compacto && (
        <div className="font-black leading-[0.9] tracking-[-0.02em]" style={{ fontSize: size * 0.56 }}>
          <div style={{ color: tema === "escuro" ? "#fff" : NAVY }}>Senhor</div>
          <div style={{ color: AMBAR }}>Multas</div>
        </div>
      )}
    </div>
  );
}

/** Meia multa rasgada (para as mãos dos mascotes). */
function Meia({ x, y, w = 26, h = 36, rot = 0, lado }: { x: number; y: number; w?: number; h?: number; rot?: number; lado: "esq" | "dir" }) {
  const z = w * 0.18;
  const corte = lado === "esq"
    ? `M0 0 H${w} L${w - z} ${h * 0.25} L${w} ${h * 0.45} L${w - z} ${h * 0.65} L${w - z * 0.3} ${h * 0.82} L${w - z} ${h} H0 Z`
    : `M${z} 0 H${w} V${h} H0 L${z} ${h * 0.82} L${z * 0.3} ${h * 0.65} L${z} ${h * 0.45} L0 ${h * 0.25} Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot} ${w / 2} ${h / 2})`}>
      <path d={corte} fill="#fff" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
      <rect x={lado === "esq" ? 0 : z} y="0" width={w - z} height={h * 0.16} fill={AMBAR} stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
      <rect x={w * 0.2} y={h * 0.38} width={w * 0.5} height="2.6" rx="1.3" fill={CINZA} />
      <rect x={w * 0.2} y={h * 0.55} width={w * 0.42} height="2.6" rx="1.3" fill={CINZA} />
    </g>
  );
}

/** 1 · O Senhor Placa — a placa do logo ganha vida, com cartola e bigode, rasgando a multa. */
export function SenhorPlaca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 240" className={clsx("select-none", className)} role="img" aria-label="Senhor Placa, mascote do Senhor Multas">
      <ellipse cx="100" cy="229" rx="50" ry="8" fill="#000" opacity=".22" />
      <rect x="92" y="150" width="16" height="80" rx="3" fill={CINZA} />
      {/* braços */}
      <path d="M50 128 Q38 134 34 146" stroke={NAVY} strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M150 128 Q162 134 166 146" stroke={NAVY} strokeWidth="7" strokeLinecap="round" fill="none" />
      <Meia x={8} y={118} rot={-14} lado="esq" />
      <Meia x={166} y={118} rot={14} lado="dir" />
      <circle cx="36" cy="146" r="6.5" fill={NAVY} />
      <circle cx="164" cy="146" r="6.5" fill={NAVY} />
      {/* rosto (a placa) */}
      <circle cx="100" cy="108" r="56" fill="#fff" stroke={NAVY} strokeWidth="12" />
      {/* cartola */}
      <rect x="64" y="46" width="72" height="9" rx="3" fill={NAVY} />
      <rect x="76" y="12" width="48" height="38" rx="3" fill={NAVY} />
      <rect x="76" y="38" width="48" height="7" fill={AMBAR} />
      {/* sobrancelhas e olhos */}
      <path d="M72 85 Q81 79 90 84" stroke={NAVY} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M110 84 Q119 79 128 85" stroke={NAVY} strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="82" cy="99" r="6" fill={NAVY} />
      <circle cx="118" cy="99" r="6" fill={NAVY} />
      {/* bochechas */}
      <circle cx="68" cy="120" r="7.5" fill="#f7d08a" />
      <circle cx="132" cy="120" r="7.5" fill="#f7d08a" />
      {/* bigode e sorriso */}
      <path d="M100 117 C93 108 76 109 72 121 C81 118 90 123 100 122 C110 123 119 118 128 121 C124 109 107 108 100 117 Z" fill={NAVY} />
      <path d="M91 133 Q100 140 109 133" stroke={NAVY} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** 2 · O Senhor de Terno — experiente e de confiança; rosto do atendimento. */
export function SenhorTerno({ className, soRosto = false }: { className?: string; soRosto?: boolean }) {
  const rosto = (
    <>
      <circle cx="70" cy="116" r="8" fill={PELE} />
      <circle cx="150" cy="116" r="8" fill={PELE} />
      <ellipse cx="110" cy="112" rx="40" ry="45" fill={PELE} />
      <path d="M70 112 C64 72 88 58 110 58 C134 58 156 72 150 112 C147 98 141 90 135 86 C121 92 99 92 85 86 C79 90 73 98 70 112 Z" fill="#c9ced6" />
      <circle cx="94" cy="112" r="12" fill="#fff" stroke={NAVY} strokeWidth="4" />
      <circle cx="126" cy="112" r="12" fill="#fff" stroke={NAVY} strokeWidth="4" />
      <path d="M106 111 H114" stroke={NAVY} strokeWidth="4" />
      <circle cx="95" cy="113" r="4.2" fill={NAVY} />
      <circle cx="125" cy="113" r="4.2" fill={NAVY} />
      <path d="M110 130 C104 123 92 124 89 133 C96 131 103 135 110 134 C117 135 124 131 131 133 C128 124 116 123 110 130 Z" fill={NAVY} />
      <path d="M102 142 Q110 147 118 142" stroke={NAVY} strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  );
  if (soRosto)
    return (
      <svg viewBox="62 52 96 108" className={clsx("select-none", className)} role="img" aria-label="Sr. Multas">
        {rosto}
      </svg>
    );
  return (
    <svg viewBox="0 0 220 240" className={clsx("select-none", className)} role="img" aria-label="Senhor de Terno, mascote do Senhor Multas">
      {/* braço erguido com a multa rasgada */}
      <path d="M160 192 Q186 160 192 110" stroke={NAVY} strokeWidth="20" strokeLinecap="round" fill="none" />
      <Meia x={168} y={44} w={22} h={32} rot={-12} lado="esq" />
      <Meia x={192} y={46} w={22} h={32} rot={14} lado="dir" />
      <circle cx="192" cy="100" r="10" fill={PELE} />
      {/* corpo */}
      <path d="M38 240 C38 186 70 164 110 164 C150 164 182 186 182 240 Z" fill={NAVY} />
      <rect x="98" y="148" width="24" height="22" fill={PELE} />
      <path d="M92 166 L110 202 L128 166 Z" fill="#fff" />
      <path d="M105 170 H115 L117 178 L113 210 H107 L103 178 Z" fill={AMBAR} />
      <path d="M92 166 L110 206 L84 182 Z" fill="#0c1d38" />
      <path d="M128 166 L110 206 L136 182 Z" fill="#0c1d38" />
      {rosto}
    </svg>
  );
}

/** 3 · O Senhor Coruja — sabedoria e Direito; olhos âmbar lembram faróis. */
export function SenhorCoruja({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 240" className={clsx("select-none", className)} role="img" aria-label="Senhor Coruja, mascote do Senhor Multas">
      <path d="M50 74 L60 20 L86 58 Z" fill={NAVY} />
      <path d="M150 74 L140 20 L114 58 Z" fill={NAVY} />
      <path d="M40 120 Q16 172 50 210 Q46 164 60 126 Z" fill="#0c1d38" />
      <path d="M160 120 Q184 172 150 210 Q154 164 140 126 Z" fill="#0c1d38" />
      <ellipse cx="100" cy="132" rx="64" ry="86" fill={NAVY} />
      <ellipse cx="100" cy="166" rx="42" ry="48" fill="#2a4f8f" />
      {[0, 1, 2].map((l) =>
        [0, 1, 2].map((c) => (
          <path key={`${l}${c}`} d={`M${80 + c * 20 - 6} ${146 + l * 18} l6 6 l6 -6`} stroke={NAVY} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )),
      )}
      <circle cx="72" cy="94" r="27" fill={AMBAR} />
      <circle cx="128" cy="94" r="27" fill={AMBAR} />
      <circle cx="72" cy="94" r="19" fill="#fff" />
      <circle cx="128" cy="94" r="19" fill="#fff" />
      <circle cx="75" cy="96" r="9" fill={NAVY} />
      <circle cx="125" cy="96" r="9" fill={NAVY} />
      <circle cx="78" cy="92" r="3" fill="#fff" />
      <circle cx="128" cy="92" r="3" fill="#fff" />
      <path d="M93 114 H107 L100 128 Z" fill={AMBAR} />
      <Meia x={66} y={150} w={28} h={38} rot={-8} lado="esq" />
      <Meia x={104} y={152} w={28} h={38} rot={10} lado="dir" />
      <ellipse cx="84" cy="219" rx="11" ry="5" fill={AMBAR} />
      <ellipse cx="116" cy="219" rx="11" ry="5" fill={AMBAR} />
    </svg>
  );
}
