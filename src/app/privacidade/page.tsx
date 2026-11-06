import Link from "next/link";
import { Documento } from "@/components/Documento";
import { EMPRESA } from "@/lib/empresa";

export const metadata = { title: "Política de privacidade · Senhor Multas" };

export default function Privacidade() {
  return (
    <Documento titulo="Política de privacidade" versao="Versão 1.0 · vigente desde 06/11/2026 · Lei Geral de Proteção de Dados (Lei 13.709/2018)">
      <p>Esta política explica quais dados pessoais o <strong>Senhor Multas</strong> ({EMPRESA.razaoSocial}, CNPJ {EMPRESA.cnpj}, {EMPRESA.endereco}) trata, para quê, com quem compartilha e como você exerce seus direitos.</p>

      <h2>1. Dados que tratamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, CPF ou CNPJ, e-mail, celular e senha (guardada apenas de forma criptografada).</li>
        <li><strong>Veículos e multas:</strong> placa, RENAVAM, dados da notificação (auto, órgão, local, data, enquadramento), nome do proprietário que consta na notificação.</li>
        <li><strong>Documentos enviados:</strong> foto ou PDF da notificação, CNH, CRLV, procuração e provas. A imagem da notificação é lida pela IA no envio e <strong>não é armazenada</strong>; guardamos apenas os dados extraídos e confirmados por você. CNH, CRLV, procuração e provas ficam guardados <strong>cifrados</strong>, apenas para instruir a sua defesa, e podem ser apagados por você.</li>
        <li><strong>Defesas:</strong> peças geradas, versões, fatos confirmados, declarações, data, hora e IP da assinatura.</li>
        <li><strong>Pagamentos:</strong> plano, valor, forma e situação do pagamento. Dados de cartão ficam somente com o Asaas.</li>
        <li><strong>Atendimento:</strong> mensagens trocadas com o assistente Sr. Multas.</li>
        <li><strong>Registros de acesso e auditoria:</strong> ações relevantes na conta, mantidos por segurança e por exigência legal (Marco Civil da Internet).</li>
      </ul>

      <h2>2. Para que usamos e com qual base legal</h2>
      <ul>
        <li>Prestar o serviço contratado: analisar a multa, gerar e acompanhar a defesa (<strong>execução de contrato</strong>, art. 7º, V).</li>
        <li>Processar pagamentos e emitir notas fiscais (<strong>execução de contrato</strong> e <strong>obrigação legal</strong>, art. 7º, II e V).</li>
        <li>Prevenir fraudes e garantir a segurança da conta (<strong>legítimo interesse</strong>, art. 7º, IX, e art. 11, II, “g”).</li>
        <li>Melhorar a estimativa de êxito com estatísticas de resultados, sempre de forma agregada (<strong>legítimo interesse</strong>).</li>
        <li>Enviar avisos de prazo e do andamento das defesas (<strong>execução de contrato</strong>).</li>
      </ul>

      <h2>3. Com quem compartilhamos</h2>
      <ul>
        <li><strong>Anthropic (IA Claude):</strong> processa a notificação e a redação da peça. Contrato sem uso dos dados para treinamento de modelos; enviamos apenas o necessário.</li>
        <li><strong>Asaas:</strong> instituição de pagamento autorizada pelo Banco Central, para cobranças e notas fiscais.</li>
        <li><strong>Supabase e Vercel:</strong> hospedagem do banco de dados (região São Paulo) e da aplicação.</li>
        <li><strong>Órgãos de trânsito:</strong> somente quando você protocola a sua defesa.</li>
      </ul>
      <p>Alguns fornecedores podem processar dados fora do Brasil, com as garantias do art. 33 da LGPD. A Anthropic e a Vercel podem processar dados nos Estados Unidos; essas transferências se apoiam em cláusulas contratuais de proteção de dados e nas demais hipóteses do art. 33 da LGPD. Não vendemos dados pessoais.</p>

      <h2>4. Por quanto tempo guardamos</h2>
      <p>Dados da conta: enquanto ela estiver ativa. Defesas, documentos enviados e registros de assinatura: por 5 (cinco) anos após o encerramento do processo administrativo, para comprovação e exercício de direitos. Dados fiscais: pelo prazo exigido na legislação tributária. Registros de acesso: 6 meses (Marco Civil da Internet, art. 15). Depois desses prazos, os dados são excluídos ou anonimizados.</p>

      <h2>5. Segurança</h2>
      <p>Dados criptografados em trânsito e em repouso, acesso restrito por perfil, documentos enviados (CNH, CRLV, provas) cifrados individualmente, registro de auditoria das ações relevantes e cópias de segurança mantidas pelo provedor do banco de dados.</p>

      <h2>6. Seus direitos</h2>
      <p>Você pode, a qualquer momento: confirmar o tratamento e acessar seus dados; corrigir dados incompletos ou errados; pedir a exclusão (ressalvados os dados que a lei exige manter); pedir a portabilidade; revogar consentimentos; e reclamar à ANPD. A maior parte disso está disponível em <Link href="/app/conta" className="text-brand underline">Minha conta</Link> (baixar meus dados, pedir correção ou exclusão). Respondemos em até 15 dias.</p>

      <h2>7. Encarregado (DPO) e contato</h2>
      <p>{EMPRESA.dpo.nome}: <strong>{EMPRESA.dpo.email}</strong>. Atendimento geral: {EMPRESA.emailAtendimento} · {EMPRESA.telefone}.</p>
    </Documento>
  );
}
