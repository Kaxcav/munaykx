import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { EMAIL_CONTATO } from "@/lib/contato";

// ⚠️ REVISÃO JURÍDICA PENDENTE. Este texto foi montado a partir do que o
// código realmente coleta (prisma/schema.prisma → model User/Lead/Rsvp,
// lib/organizacao.ts) — o inventário de dados é confiável; a QUALIFICAÇÃO
// jurídica (bases legais, prazos de retenção, redação de direitos) precisa de
// advogado antes do go-live. Duas pendências de infraestrutura/decisão estão no
// aviso do topo da página. Ver docs/PRIVACIDADE-rascunho-lgpd.md (branch
// feat/painel-cadastro) para o inventário completo e as notas por seção.
//
// Canal do titular (LGPD): EMAIL_CONTATO é a fonte única (lib/contato.ts) —
// mantido aqui pra não divergir do rodapé. HOJE ele não recebe (o domínio não
// tem registro MX). O canal DEDICADO a configurar aparece no aviso do topo.

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Quais dados a MUNAY coleta, pra quê, base legal e como exercer seus direitos. LGPD em linguagem simples.",
};

export default function PrivacidadePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-20">
        <p className="eyebrow mb-3">LGPD</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Política de privacidade
        </h1>
        <p className="mt-4 text-petroleo/70">
          Sem juridiquês: o que coletamos, pra quê, com qual base legal e como
          você exerce seus direitos. Versão preliminar de agosto de 2026.
        </p>

        {/* AVISO — não some sem as duas pendências resolvidas (ver comentário no topo). */}
        <div className="mt-8 rounded-card border border-petroleo/30 bg-white/70 p-6 text-sm text-petroleo/80">
          <p className="font-display text-base font-bold text-petroleo">
            ⚠️ Versão preliminar — revisão jurídica pendente
          </p>
          <p className="mt-2">
            Este texto ainda <strong>não passou por revisão jurídica</strong>.
            As bases legais e os prazos de retenção abaixo são propostos e
            precisam ser confirmados por advogado antes da publicação.
          </p>
          <p className="mt-2">
            <strong>Canal do titular a configurar:</strong> o e-mail de contato
            do domínio ainda <strong>não recebe mensagens</strong> (falta
            registro MX). Antes do go-live é preciso ativar uma caixa com MX
            válido — por exemplo{" "}
            <span className="font-mono">privacidade@[DOMÍNIO-COM-MX-A-DEFINIR]</span>{" "}
            — para o canal de LGPD funcionar. Enquanto isso, o endereço de
            contato exibido abaixo é provisório.
          </p>
        </div>

        <div className="mt-12 space-y-10">
          {/* 1 — Controlador */}
          <section>
            <h2 className="font-display text-xl font-bold">
              1. Quem é o controlador
            </h2>
            <p className="mt-3 text-petroleo/80">
              MUNAY — plataforma de descoberta de comunidades esportivas e
              culturais do Distrito Federal. A identificação completa do
              controlador (pessoa física ou jurídica, com os dados de registro)
              e a indicação do <strong>Encarregado (DPO)</strong> exigida pelo
              art. 41 da LGPD serão preenchidas na versão final.
            </p>
            <p className="mt-3 text-petroleo/80">
              Canal do titular de dados (provisório):{" "}
              <a
                href={`mailto:${EMAIL_CONTATO}`}
                className="underline underline-offset-4"
              >
                {EMAIL_CONTATO}
              </a>
              . Ver o aviso no topo sobre a caixa de e-mail a configurar.
            </p>
          </section>

          {/* 2 — O que coletamos */}
          <section>
            <h2 className="font-display text-xl font-bold">
              2. O que coletamos, pra quê e com qual base legal
            </h2>
            <p className="mt-3 text-petroleo/80">
              Cada item abaixo existe porque há um campo correspondente no nosso
              banco de dados — este é o inventário real, não um modelo genérico.
              As bases legais citadas são propostas (pendentes de validação
              jurídica).
            </p>

            <h3 className="mt-6 font-semibold">2.1 · Quem usa o site sem conta</h3>
            <p className="mt-2 text-petroleo/80">
              <strong>Inscrição em evento não exige conta</strong> e não vai
              exigir.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-petroleo/80">
              <li>
                <strong>Nome, e-mail e WhatsApp (opcional)</strong> — na lista de
                espera e na inscrição em evento (RSVP), para identificar a
                pessoa, confirmar a inscrição e avisar sobre mudanças e promoção
                da fila de espera. Base: execução de procedimento a pedido do
                titular (art. 7º, V).
              </li>
              <li>
                <strong>Região e modalidade de interesse (opcional)</strong> — na
                lista de espera, para priorizar onde a MUNAY entra primeiro.
                Base: consentimento (art. 7º, I).
              </li>
              <li>
                <strong>Nome da comunidade e modalidade (opcional)</strong> — na
                lista de organizadores, para avaliar parceria. Base: art. 7º, V.
              </li>
            </ul>
            <p className="mt-3 text-petroleo/80">
              Não pedimos documento de identidade, dado financeiro, bancário nem
              geolocalização em tempo real.
            </p>

            <h3 className="mt-6 font-semibold">
              2.2 · Quem cria conta e preenche perfil
            </h3>
            <p className="mt-2 text-petroleo/80">
              <strong>Todos estes campos são opcionais</strong> — a conta
              funciona sem perfil, e nenhum deles é condição para usar a MUNAY.
              Coletamos, quando você preenche: <strong>nome</strong> e{" "}
              <strong>e-mail</strong> (credencial de acesso por link mágico),{" "}
              <strong>telefone</strong>, <strong>data de nascimento</strong>{" "}
              (faixa etária de eventos e o portão de idade da LGPD para menores),{" "}
              <strong>gênero autodeclarado</strong> (ver 2.4),{" "}
              <strong>cidade, UF e CEP</strong> (recomendação por proximidade),{" "}
              <strong>apelido, bio e foto</strong> (perfil público, que{" "}
              <strong>nasce desligado</strong>), <strong>tags de interesse</strong>{" "}
              e <strong>respostas de perguntas leves</strong> (sugestões e
              personalidade do perfil). Base proposta: consentimento (art. 7º, I),
              exceto o e-mail, que é execução de contrato (art. 7º, V) por ser a
              credencial de acesso.
            </p>

            <h3 className="mt-6 font-semibold">2.3 · Os três consentimentos</h3>
            <p className="mt-2 text-petroleo/80">
              A lei não aceita consentimento em bloco para finalidades distintas
              (art. 8º, §4º). São três caixas independentes:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-petroleo/80">
              <li>
                <strong>Guardar meus dados de cadastro</strong> — autoriza tratar
                os dados de perfil (2.2). É o único obrigatório para{" "}
                <em>existir</em> perfil; sem ele nada é gravado, mas a conta e a
                inscrição em eventos continuam funcionando.
              </li>
              <li>
                <strong>Usar meu histórico pra me recomendar coisas</strong> —
                livre e reversível. Recusar não muda nada além de recomendações
                piores.
              </li>
              <li>
                <strong>Entrar em estatísticas gerais sobre o público</strong> —
                livre e reversível. Números <strong>agregados e anônimos</strong>
                , sem nome nem e-mail. Nunca vendidos nem repassados
                individualmente.
              </li>
            </ul>
            <p className="mt-3 text-petroleo/80">
              Guardamos a <strong>data, a hora e a versão desta política</strong>{" "}
              de cada consentimento — é a prova de <em>quando</em> e{" "}
              <em>contra qual texto</em> você concordou. Os dois últimos se ligam
              e desligam na própria tela de perfil, a qualquer momento.
            </p>

            <h3 className="mt-6 font-semibold">
              2.4 · Gênero — decisão pendente de jurídico
            </h3>
            <p className="mt-2 text-petroleo/80">
              O campo de gênero é autodeclarado e de texto livre. Ele não é
              automaticamente dado sensível, mas dependendo do que a pessoa
              escreva pode revelar informação protegida pelo art. 5º, II. Antes
              da publicação, o jurídico define se ele será tratado como dado
              sensível (com consentimento destacado e específico, art. 11) ou
              como dado comum com finalidade estritamente declarada
              (representatividade e inclusão), sem segmentação individual.
            </p>

            <h3 className="mt-6 font-semibold">2.5 · Menores de idade</h3>
            <p className="mt-2 text-petroleo/80">
              A data de nascimento permite aplicar o art. 14 (tratamento de dados
              de crianças e adolescentes). A idade mínima para conta própria e a
              regra entre 13 e 18 anos — incluindo o consentimento específico e
              destacado de pelo menos um dos pais ou responsável — serão
              definidas com o jurídico e declaradas aqui na versão final.
            </p>
          </section>

          {/* 3 — Quem tem acesso */}
          <section>
            <h2 className="font-display text-xl font-bold">3. Quem tem acesso</h2>
            <p className="mt-3 text-petroleo/80">
              <strong>Equipe MUNAY:</strong> acessa o necessário para operar a
              plataforma e responder pedidos de titular.
            </p>
            <p className="mt-3 text-petroleo/80">
              <strong>Organizadores de comunidade:</strong> quem organiza uma
              comunidade vê <strong>nome, e-mail e WhatsApp de quem se inscreveu
              nos eventos dele</strong> — para avisar mudança de local, confirmar
              presença e gerenciar a fila de espera. O organizador{" "}
              <strong>nunca</strong> vê: quem se inscreveu em eventos de outra
              comunidade; leads que não se inscreveram nos eventos dele; qualquer
              número agregado da base; nem o perfil completo do inscrito (data de
              nascimento, CEP, gênero e respostas não aparecem na lista de
              inscritos). A exportação de lista é <strong>por evento</strong>,
              nunca global — e essa contenção é aplicada na camada de dados e
              coberta por testes automatizados.
            </p>
            <p className="mt-3 text-petroleo/80">
              <strong>Operadores (fornecedores):</strong> Railway (hospedagem e
              banco), Resend (envio de e-mail transacional — trata nome e e-mail
              no momento do envio) e Umami (métricas agregadas e anônimas, sem
              cookie de rastreamento individual). A eventual{" "}
              <strong>transferência internacional</strong> de dados (Railway e
              Resend têm infraestrutura fora do Brasil) e as cláusulas dos arts.
              33 a 36 serão confirmadas com o jurídico. Não vendemos, alugamos nem
              cedemos dados pessoais a terceiros.
            </p>
          </section>

          {/* 4 — Retenção */}
          <section>
            <h2 className="font-display text-xl font-bold">
              4. Por quanto tempo guardamos
            </h2>
            <p className="mt-3 text-petroleo/80">
              Prazos <strong>propostos</strong> (a confirmar com o jurídico):
              conta e perfil, enquanto a conta existir; inscrição em evento, 24
              meses após o evento; lead de lista de espera, até o pedido de
              exclusão ou 24 meses sem interação; registro de consentimento (data
              + versão), 5 anos após a revogação, por ser a prova da base legal;
              logs de acesso, 6 meses (art. 15 do Marco Civil). Depois do prazo, o
              dado é apagado ou anonimizado de forma irreversível.
            </p>
          </section>

          {/* 5 — Direitos */}
          <section>
            <h2 className="font-display text-xl font-bold">
              5. Seus direitos (art. 18)
            </h2>
            <p className="mt-3 text-petroleo/80">
              A qualquer momento e de graça, você pode: confirmar se tratamos
              seus dados; acessá-los; corrigir dado incompleto ou desatualizado;
              anonimizar, bloquear ou eliminar dado desnecessário ou tratado fora
              da lei; portar os dados; eliminar dado tratado com base em
              consentimento; saber com quem compartilhamos; e revogar o
              consentimento.
            </p>
            <p className="mt-3 text-petroleo/80">
              Boa parte disso não precisa de e-mail: a tela de perfil deixa ver,
              corrigir e apagar os próprios dados e ligar/desligar os
              consentimentos opcionais na hora. Para o resto, escreva para{" "}
              <a
                href={`mailto:${EMAIL_CONTATO}`}
                className="underline underline-offset-4"
              >
                {EMAIL_CONTATO}
              </a>{" "}
              (canal provisório — ver aviso no topo), do endereço que você
              cadastrou. Respondemos em até 15 dias (art. 19, II). Você também
              pode peticionar diretamente à <strong>ANPD</strong>.
            </p>
          </section>

          {/* 6 — Segurança */}
          <section>
            <h2 className="font-display text-xl font-bold">6. Segurança</h2>
            <p className="mt-3 text-petroleo/80">
              Conexão criptografada (HTTPS) em todo o site e acesso ao banco
              restrito à equipe. O login é por link mágico —{" "}
              <strong>não guardamos senha</strong>, e os tokens de acesso ficam
              gravados com hash, de modo que o vazamento dessa tabela não vira
              login de ninguém. Em caso de incidente de segurança com risco
              relevante, comunicamos a ANPD e os titulares afetados (art. 48).
            </p>
          </section>

          {/* 7 — Cookies */}
          <section>
            <h2 className="font-display text-xl font-bold">7. Cookies</h2>
            <p className="mt-3 text-petroleo/80">
              Usamos apenas o cookie de <strong>sessão</strong> (mantém o login) e
              métricas agregadas e anônimas via Umami. Não há cookie de
              rastreamento individual, perfil de navegação nem pixel de rede
              publicitária.
            </p>
          </section>

          {/* 8 — Mudanças */}
          <section>
            <h2 className="font-display text-xl font-bold">
              8. Mudanças nesta política
            </h2>
            <p className="mt-3 text-petroleo/80">
              Quando o texto mudar de forma relevante, avisamos por e-mail quem
              tem conta e pedimos novo aceite. A versão vigente fica registrada
              junto com cada consentimento, então mudar a política não apaga a
              prova de que a pessoa concordou com a versão anterior.
            </p>
          </section>
        </div>

        <Link
          href="/"
          className="mt-14 inline-block font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60 hover:text-petroleo"
        >
          ← Voltar pro início
        </Link>
      </main>
      <Footer />
    </>
  );
}
