import Link from "next/link";
import { Documento } from "@/components/Documento";

export const metadata = { title: "Termos de uso · Senhor Multas" };

export default function Termos() {
  return (
    <Documento titulo="Termos de uso" versao="Versão 0.1 (minuta) · 06/11/2026">
      <p>
        Estes Termos regulam o uso da plataforma <strong>Senhor Multas</strong>, operada por <strong>[RAZÃO SOCIAL]</strong>, CNPJ <strong>[00.000.000/0000-00]</strong>, com sede em <strong>[ENDEREÇO]</strong> (“Senhor Multas”, “nós”). Ao criar uma conta, você declara ter lido e aceitado estes Termos e a <Link href="/privacidade" className="text-brand underline">Política de privacidade</Link>.
      </p>

      <h2>1. O que o Senhor Multas faz</h2>
      <p>A plataforma recebe a notificação de multa enviada por você, extrai os dados com inteligência artificial, verifica possíveis nulidades formais por regras automáticas, estima a chance de êxito com base em casos semelhantes e gera uma minuta de defesa administrativa (defesa prévia, recurso à JARI ou ao CETRAN), com fundamentos conferidos na legislação.</p>

      <h2>2. O que o Senhor Multas não faz</h2>
      <ul>
        <li><strong>Não é escritório de advocacia</strong> e não presta consultoria jurídica individual. [Ajustar conforme o parecer jurídico sobre o modelo da operação.]</li>
        <li><strong>Não garante resultado.</strong> A decisão é sempre do órgão julgador. A estimativa de êxito é uma faixa baseada em casos anteriores, não uma promessa.</li>
        <li>Não protocola a defesa em seu nome sem a sua assinatura, nem age como seu representante perante os órgãos de trânsito.</li>
        <li>Casos de suspensão ou cassação do direito de dirigir e documentos ilegíveis ficam fora do atendimento automatizado e são sinalizados para análise especial.</li>
      </ul>

      <h2>3. Geração por IA e a sua responsabilidade</h2>
      <ul>
        <li>A peça é <strong>gerada por inteligência artificial</strong> e passa por uma verificação automática: citações de lei que não forem confirmadas na base de normas são removidas antes de chegar a você.</li>
        <li><strong>A peça sai em seu nome.</strong> Antes de assinar, você deve conferir os fatos destacados (datas, local, placa, condutor) e pode pedir ajustes.</li>
        <li>Ao assinar, você declara que os fatos e documentos enviados são verdadeiros. Declarações falsas podem configurar crime (Código Penal, art. 299).</li>
        <li>Você é responsável por protocolar a peça dentro do prazo indicado na notificação, seguindo as orientações da plataforma.</li>
      </ul>

      <h2>4. Conta e acesso</h2>
      <p>Você deve informar dados verdadeiros e manter sua senha em sigilo. A conta é pessoal; empresas e frotas podem ter usuários adicionais. Podemos suspender contas com indícios de fraude, uso indevido ou violação destes Termos.</p>

      <h2>5. Créditos, preços e pagamentos</h2>
      <ul>
        <li>1 crédito corresponde à defesa completa de 1 multa, incluindo as fases seguintes da mesma multa (defesa prévia, JARI e CETRAN).</li>
        <li>A análise inicial é gratuita. O crédito só é consumido quando você confirma a geração da defesa.</li>
        <li>Os créditos valem por <strong>[12 meses]</strong> a partir da compra e são liberados após a confirmação do pagamento pela instituição de pagamento (Asaas).</li>
        <li>Pagamentos por Pix, cartão ou boleto são processados pelo Asaas. Não armazenamos dados de cartão.</li>
      </ul>

      <h2>6. Cancelamento, arrependimento e reembolso</h2>
      <p>[A DEFINIR PELO JURÍDICO.] Sugestão de partida: direito de arrependimento em até 7 dias da compra para créditos não utilizados (Código de Defesa do Consumidor, art. 49); créditos já consumidos não são reembolsáveis, pois o serviço foi prestado; estornos e contestações removem os créditos ainda não usados.</p>

      <h2>7. Parceiros</h2>
      <p>Se você chegou por uma loja, despachante ou outro parceiro, ele pode receber comissão sobre a sua compra, separada automaticamente na própria cobrança. O preço para você é o mesmo.</p>

      <h2>8. Uso aceitável</h2>
      <p>É proibido enviar documentos de terceiros sem autorização, tentar manipular a IA com instruções ocultas nos arquivos, usar a plataforma para fins ilícitos ou tentar acessar dados de outros usuários.</p>

      <h2>9. Limitação de responsabilidade</h2>
      <p>[A DEFINIR PELO JURÍDICO.] Não respondemos pelo resultado do julgamento, por defesas não protocoladas no prazo ou por informações incorretas fornecidas pelo usuário, nos limites permitidos pelo Código de Defesa do Consumidor.</p>

      <h2>10. Alterações e foro</h2>
      <p>Podemos atualizar estes Termos, avisando com antecedência pelos canais cadastrados. Fica eleito o foro do domicílio do consumidor. Dúvidas: <strong>[e-mail de atendimento]</strong>.</p>
    </Documento>
  );
}
