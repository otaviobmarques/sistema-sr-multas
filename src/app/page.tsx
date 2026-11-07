import Link from "next/link";
import { AssinaturaDomma, AssinaturaRedbox } from "@/components/Creditos";
import { ArrowRight, CheckCircle2, FileCheck2, Fingerprint, Gauge, Lock, Radar, ScanText, ShieldCheck, Sparkles, Store, Workflow } from "lucide-react";
import { Logo, brl } from "@/components/ui";
import { SenhorCoruja, SenhorPlaca, SenhorTerno } from "@/components/Marca";
import { EntrarBotoes } from "./EntrarBotoes";

const PLANOS = [
  { nome: "Avulso", preco: 79.9, por: 79.9, n: 1 },
  { nome: "Até 5 defesas", preco: 349, por: 69.8, n: 5, destaque: true },
  { nome: "20 defesas", preco: 1190, por: 59.5, n: 20 },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-brand/15 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-[400px] w-[500px] rounded-full bg-ia/10 blur-[120px]" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-ink-300 md:flex">
          <a href="#como" className="hover:text-white">Como funciona</a>
          <a href="#seguranca" className="hover:text-white">Segurança</a>
          <a href="#planos" className="hover:text-white">Planos</a>
          <a href="#turma" className="hover:text-white">A turma</a>
        </nav>
        <EntrarBotoes compact />
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-14 lg:grid-cols-[1.05fr_1fr]">
        <div className="rise">
          <div className="inline-flex items-center gap-2 rounded-full border border-ia/25 bg-ia/5 px-3 py-1 text-xs text-ia">
            <Sparkles className="size-3.5" /> Inteligência artificial com trava de citações
          </div>
          <h1 className="mt-6 text-[42px] font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
            Sua multa, <span className="text-gradient">defendida em minutos.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-300">
            Envie a foto da notificação. O Senhor Multas audita o auto, pesquisa a lei na fonte oficial e entrega a <b className="text-white">Defesa Pronta</b> — você confere os fatos e assina.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <EntrarBotoes />
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink-400">
            {["Análise gratuita", "Sem promessa de resultado", "PDF e DOCX", "Pix, cartão ou boleto"].map((t) => (
              <span key={t} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-ok" /> {t}</span>
            ))}
          </div>
        </div>

        {/* Mock visual */}
        <div className="relative rise" style={{ animationDelay: ".15s" }}>
          <SenhorPlaca className="absolute -right-16 -top-24 z-10 hidden h-32 rotate-6 drop-shadow-[0_10px_25px_rgba(0,0,0,.5)] lg:block" />
          <div className="panel ring-ia relative overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-ink-400"><ScanText className="size-4 text-ia" /> notificacao_autuacao.pdf</div>
              <span className="rounded-full bg-ia/10 px-2 py-0.5 text-[10px] font-semibold text-ia">LENDO DOCUMENTO</span>
            </div>
            <div className="relative mt-4 grid grid-cols-2 gap-2.5 overflow-hidden rounded-xl border border-white/6 bg-ink-950/60 p-4 text-xs">
              <div className="scan-line" />
              {[["Placa", "ABC1D23"], ["Órgão", "DER-MG"], ["Infração", "Excesso de velocidade"], ["Fase", "Defesa Prévia"], ["Prazo", "18 dias"], ["Equipamento", "Radar 00872-MG"]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-white/[.03] p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">{k}</div>
                  <div className="mt-0.5 font-medium text-white">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-xs">
              {[["Prazo de expedição", "Ok", "text-ok bg-ok/10"], ["Aferição do equipamento", "Não informado", "text-warn bg-warn/10"], ["Campos obrigatórios", "Completo", "text-ok bg-ok/10"], ["Descrição x enquadramento", "Coerente", "text-ok bg-ok/10"]].map(([k, v, c]) => (
                <div key={k} className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2">
                  <span className="text-ink-300">{k}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c}`}>{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-white/6 bg-white/[.02] p-3">
              <div className="flex justify-between text-[11px] text-ink-400"><span>Estimativa de êxito</span><span className="text-warn">Moderada · exemplo ilustrativo</span></div>
              <div className="mt-2 h-1.5 rounded-full bg-white/6"><div className="h-full w-[61%] rounded-full bg-gradient-to-r from-amber-600 to-brand" /></div>
            </div>
          </div>
          <div className="panel absolute -bottom-24 -left-8 hidden w-64 !bg-ink-900 p-4 shadow-2xl shadow-black/60 md:block">
            <div className="flex items-center gap-2 text-xs"><ShieldCheck className="size-4 text-ok" /> <span className="text-white">Trava automática</span></div>
            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between"><span className="text-ink-300">CTB · art. 281</span><span className="text-ok">Confirmada</span></div>
              <div className="flex justify-between"><span className="text-ink-300">Res. CONTRAN</span><span className="text-ok">Confirmada</span></div>
              <div className="flex justify-between"><span className="text-ink-300">STJ · Tema 105</span><span className="text-ok">Confirmada</span></div>
              <div className="flex justify-between"><span className="text-ink-300">Precedente fora da base</span><span className="text-bad">Removido</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <div className="max-w-2xl">
          <div className="label text-brand">Ciclo completo</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">Concorrentes vendem recurso. Nós cuidamos da multa inteira.</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { i: ScanText, t: "1. Envie a notificação", d: "Foto ou PDF pelo app ou WhatsApp. A IA extrai placa, órgão, enquadramento, fase e prazo — você confirma." },
            { i: Gauge, t: "2. Auditoria e estimativa", d: "Motor de regras checa as nulidades formais. Estimativa de êxito pelo histórico do órgão, e a comparação com pagar com desconto." },
            { i: Workflow, t: "3. Defesa Pronta", d: "Agentes pesquisam e redigem a peça da fase certa. Cada citação é conferida na fonte oficial antes de chegar a você." },
            { i: Fingerprint, t: "4. Você valida e assina", d: "Confira os fatos destacados, peça ajustes à IA e assine eletronicamente. Protocolo online ou guiado e alertas de prazo." },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="panel panel-hover p-6">
              <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-brand/20 to-brand/5 ring-1 ring-brand/25"><I className="size-5 text-brand" /></div>
              <h3 className="mt-5 font-semibold text-white">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SEGURANÇA */}
      <section id="seguranca" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <div className="panel relative overflow-hidden p-8 md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-ok/10 blur-3xl" />
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <div className="label text-ok">Segurança automatizada</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Nenhuma citação sem fonte verificada.</h2>
              <div className="mb-5 mt-6 inline-flex items-center gap-3 rounded-2xl bg-[#f5f3ef] py-2 pl-2 pr-4"><SenhorCoruja className="h-16" /><span className="text-xs font-semibold text-[#13294b]">O Senhor Coruja confere<br />cada citação na fonte oficial.</span></div>
              <p className="text-ink-300">A IA não inventa leis. Um verificador independente confere cada trecho na fonte oficial; o que não for confirmado sai da peça — sem exceção.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { i: Lock, t: "Trava de citações", d: "O redator só cita o que veio do pesquisador; o verificador confere de novo." },
                { i: ShieldCheck, t: "Modo conservador", d: "Com confiança baixa, a peça usa só as nulidades e o texto da lei." },
                { i: Radar, t: "Controle de escopo", d: "Suspensão, cassação e documentos ilegíveis ficam sinalizados." },
                { i: FileCheck2, t: "Rastreabilidade", d: "Cada peça guarda versão do modelo, do prompt, das regras e das fontes." },
              ].map(({ i: I, t, d }) => (
                <div key={t} className="rounded-xl border border-white/6 bg-ink-950/40 p-4">
                  <I className="size-5 text-ok" />
                  <div className="mt-3 text-sm font-semibold text-white">{t}</div>
                  <div className="mt-1 text-xs leading-relaxed text-ink-400">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <div className="text-center">
          <div className="label text-brand">Planos de créditos</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">1 crédito = 1 multa, todas as fases.</h2>
          <p className="mt-3 text-ink-400">Defesa prévia, JARI e CETRAN da mesma multa no mesmo crédito. Análise sempre gratuita.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
          {PLANOS.map((p) => (
            <div key={p.nome} className={`panel relative p-7 ${p.destaque ? "ring-1 ring-brand/50 shadow-[0_0_60px_-20px_var(--color-brand)]" : ""}`}>
              {p.destaque && <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-0.5 text-[11px] font-bold text-[#1a1203]">Mais escolhido</span>}
              <div className="text-sm text-ink-300">{p.nome}</div>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-white">{brl(p.preco)}</div>
              <div className="mt-1 text-xs text-ink-400">{brl(p.por)} por defesa · válido 12 meses</div>
              <Link href="/entrar" className={`btn mt-6 w-full ${p.destaque ? "btn-primary" : "btn-ghost"}`}>Começar</Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-ink-400">Valores ilustrativos. Frotas e empresas: plano Personalizado com franquia mensal.</p>
      </section>

      {/* MASCOTES */}
      <section id="turma" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <div className="text-center">
          <div className="label text-brand">A turma do Senhor Multas</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">Quem cuida da sua multa</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { n: "1 · O Senhor Placa", d: "A própria placa do logo ganha vida, com cartola e bigode de “Senhor”, rasgando a multa.", bg: "#f5f3ef", M: SenhorPlaca },
            { n: "2 · O Senhor de Terno", d: "Um senhor de verdade, experiente e de confiança. É ele quem te atende no app e no WhatsApp.", bg: "#e6edf7", M: SenhorTerno },
            { n: "3 · O Senhor Coruja", d: "Símbolo de sabedoria e do Direito: confere cada lei na fonte oficial. Os olhos âmbar lembram faróis.", bg: "#f5f3ef", M: SenhorCoruja },
          ].map(({ n, d, bg, M }) => (
            <div key={n} className="group overflow-hidden rounded-2xl p-6 text-center transition hover:-translate-y-1" style={{ background: bg }}>
              <div className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#13294b]">{n}</div>
              <M className="mx-auto mt-4 h-56 transition duration-300 group-hover:scale-[1.04]" />
              <p className="mx-auto mt-4 max-w-xs text-sm font-medium leading-relaxed text-[#13294b]/80">{d}</p>
            </div>
          ))}
        </div>
      </section>


      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-20">
        <div className="panel flex flex-col items-center gap-6 p-10 text-center md:p-14">
          <div className="grid size-28 place-items-center overflow-hidden rounded-full bg-[#e6edf7] ring-4 ring-brand/30"><SenhorTerno soRosto className="mt-2 size-24" /></div>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white">Recebeu uma multa? Fale com o Sr. Multas.</h2>
          <p className="max-w-xl text-ink-400">Atendimento 24h no app e no WhatsApp. Ele lê a notificação, explica o prazo e mostra se vale recorrer.</p>
          <EntrarBotoes />
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-ink-400">
          <Logo size={24} />
          <p className="max-w-xl">A defesa é gerada por IA, validada e assinada pelo próprio interessado. O Senhor Multas não garante resultado: a decisão é do órgão julgador.</p>
          <p className="flex gap-4"><Link href="/termos" className="hover:text-white">Termos de uso</Link><Link href="/privacidade" className="hover:text-white">Privacidade</Link><span>© {new Date().getFullYear()} Senhor Multas</span></p>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/5 px-5 py-5 sm:justify-between">
          <AssinaturaRedbox />
          <AssinaturaDomma prefixo="Sistema desenvolvido por" className="!text-xs [&_svg]:!h-5" />
        </div>
      </footer>
    </div>
  );
}
