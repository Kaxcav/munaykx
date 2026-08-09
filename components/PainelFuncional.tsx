import Link from "next/link";

/**
 * O PAINEL FUNCIONAL — briefing 07/08/2026, itens 4, 4.1 e 5.
 *
 * "Estruturar com clareza como o painel funcional da plataforma se divide.
 * Três blocos centrais: Comunidade, Mapa, Organizadores."
 *
 * ── POR QUE ORGANIZADORES OCUPA A LARGURA INTEIRA ────────────────────────
 *
 * Não é capricho de layout. É a RECOMENDAÇÃO ESTRATÉGICA do próprio
 * briefing, transcrita: "Priorizar UX e design da seção Organizadores acima
 * das demais. É essa seção que gera receita direta — comissão, antecipação
 * e ingressos — e sustenta o modelo B2B2C do MUNAY. (…) É o motor de todo o
 * ecossistema."
 *
 * Três cards iguais diriam ao olho que as três coisas pesam igual. Pesam
 * não: sem organizador não existe oferta, e sem oferta os outros dois blocos
 * ficam bonitos e vazios — que é literalmente o estado do site hoje
 * (`/comunidades` responde "Nada por aqui", `/mapa` mostra 35 de 35 regiões
 * vazias). A hierarquia visual aqui conta essa verdade.
 *
 * ── ITEM 4.1, DECIDIDO: SÃO OS DOIS ──────────────────────────────────────
 *
 * O briefing pergunta se Organizadores é **B2B** (parceiros institucionais e
 * empresas) ou **B2S** (venda e prestação de serviço pro mercado wellness:
 * academias, instrutores, produtores de evento, autônomos).
 *
 * **Resposta do Kaxcav em 07/08/2026: os dois.**
 *
 * A primeira versão deste componente tinha uma copy propositalmente neutra,
 * escrita "pra caber nas duas" enquanto a decisão não vinha. Ela foi jogada
 * fora — e vale entender por quê, porque a diferença é sutil e é a coisa
 * mais importante deste arquivo.
 *
 * Copy que serve dois públicos ao mesmo tempo não fala com nenhum dos dois.
 * "Quem produz e vende experiência" é verdadeiro pro professor de yoga e pro
 * gerente de marketing de uma rede de academia, e é inútil pros dois: o
 * primeiro não sabe se é pra ele porque parece corporativo demais, o segundo
 * não sabe se é pra ele porque parece pequeno demais. Cada um vai embora
 * achando que o site é do outro.
 *
 * "Os dois" resolvido direito não é uma mensagem que cabe em ambos — são
 * DUAS mensagens, lado a lado, cada uma dizendo o nome de quem ela quer. Daí
 * as duas trilhas em `TRILHAS`: a pessoa se reconhece em uma e ignora a
 * outra, que é exatamente o comportamento desejado.
 *
 * HIERARQUIA ENTRE AS DUAS: a de produção (B2S) leva o botão sólido em lime
 * e vem primeiro. Não é preferência de gosto — é o funil. Ela é quem coloca
 * oferta no ar antes de 03/09, com ciclo de decisão de dias; a institucional
 * negocia em trimestres e precisa de base pra negociar. B2B sem oferta é
 * conversa sobre um catálogo vazio.
 *
 * ── ITEM 5, CURSOS ───────────────────────────────────────────────────────
 *
 * "Mapeada como próxima adição ao roadmap (…) Não é prioridade imediata,
 * mas deve constar no planejamento de conteúdo e na estrutura de navegação."
 * Entra como faixa de roadmap declarada — não como link morto. Link pra
 * página que não existe é pior que ausência: quebra confiança na primeira
 * vez que alguém clica.
 */

const BLOCOS = [
  {
    href: "/comunidades",
    eyebrow: "Bloco 01",
    titulo: "Comunidade",
    texto:
      "Onde você descobre, entra e acompanha os grupos. Filtra por modalidade, região, horário e nível — e vê a agenda de quem você já segue.",
    itens: ["Descoberta com filtro", "Página de cada comunidade", "Agenda e avisos"],
  },
  {
    href: "/mapa",
    eyebrow: "Bloco 02",
    titulo: "Mapa",
    texto:
      "As 35 regiões do DF, uma por uma — inclusive as que ainda não têm ninguém. Descoberta pelo lugar, não pela busca: você vê o que existe do seu lado.",
    itens: ["35 regiões administrativas", "Comunidades por região", "Eventos por lugar"],
  },
] as const;

/**
 * As duas trilhas de Organizadores (item 4.1 — ver a nota no topo).
 *
 * `primaria` marca quem leva o botão sólido. Só uma pode ser: dois CTAs de
 * mesmo peso lado a lado é a definição de nenhuma prioridade.
 *
 * Os dois `href` apontam pro MESMO formulário (`#organizador`), e isso é
 * deliberado: o `Lead` tem `tipo: participante | organizador`, e criar um
 * terceiro valor no enum custaria migração + mudança no /admin + no CSV, pra
 * separar dois públicos que hoje somam zero cadastros. O campo `organizacao`,
 * que já existe no formulário, distingue os dois na prática. Quando o volume
 * justificar, vira enum próprio.
 */
const TRILHAS = [
  {
    id: "producao",
    etiqueta: "Trilha 01 · quem produz",
    titulo: "Você organiza",
    quem: "Run club, estúdio, professor autônomo, produtor de evento, academia de bairro.",
    primaria: true,
    cta: "Quero publicar",
    href: "/#organizador",
    itens: [
      ["Publique", "Comunidade, agenda e evento no ar em minutos — sem site próprio"],
      ["Encha", "Inscrição com controle de vaga e lista de espera automática"],
      // ⚠️ Havia aqui um bullet "Receba — ingresso pago, comissão
      // transparente". SAIU em 07/08/2026: é promessa comercial de receita
      // e NÃO EXISTE uma linha de código de pagamento (C6 é pós-tração, e o
      // Blueprint argumenta que é um segundo produto, não uma camada).
      // Publicar oferta que o produto não honra é o mesmo erro do e-mail de
      // contato que apontava pra um domínio inexistente (a história está em
      // `lib/contato.ts`) — só que dirigido a quem a gente quer como parceiro.
      // Volta quando C6 existir.
      ["Acompanhe", "Quem confirmou, quem entrou na fila e quem cancelou"],
      ["Entenda", "Quem foi, quem voltou e o que seu público procura"],
    ],
  },
  {
    id: "institucional",
    etiqueta: "Trilha 02 · quem apoia",
    titulo: "Sua marca patrocina",
    quem: "Marca, rede de academias, empresa com programa de bem-estar, órgão público.",
    primaria: false,
    cta: "Falar com a gente",
    href: "/#organizador",
    itens: [
      ["Ative de verdade", "Presença dentro de comunidade que já existe — não banner"],
      ["Escolha o recorte", "Por modalidade, região do DF e perfil de público"],
      ["Patrocine evento", "Da corrida de bairro ao festival, com métrica de presença"],
      ["Cuide do seu time", "Programa de bem-estar com a oferta que a cidade já tem"],
    ],
  },
] as const;

export default function PainelFuncional() {
  return (
    <section id="plataforma" className="mx-auto max-w-6xl px-5 py-20">
      <p className="eyebrow mb-3">A plataforma</p>
      <h2 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        Três lugares. Nenhum deles é um app de busca.
      </h2>
      <p className="mt-4 max-w-xl text-petroleo/70">
        A MUNAY se divide em três — e cada um resolve uma pergunta diferente.
      </p>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {BLOCOS.map((b) => (
          <Link
            key={b.titulo}
            href={b.href}
            className="group rounded-card border border-salvia/40 bg-salvia-soft p-8 transition-all hover:-translate-y-0.5 hover:border-salvia"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-salvia-deep">
              {b.eyebrow}
            </p>
            <h3 className="mt-3 font-display text-2xl font-extrabold tracking-tight">
              {b.titulo}
            </h3>
            <p className="mt-3 leading-relaxed text-petroleo/75">{b.texto}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {b.itens.map((i) => (
                <li
                  key={i}
                  className="rounded-full border border-salvia/50 bg-areia/60 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-salvia-deep"
                >
                  {i}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm font-semibold underline underline-offset-4 group-hover:text-salvia-deep">
              Dá uma conferida →
            </p>
          </Link>
        ))}
      </div>

      {/* Bloco 03 — o motor. Ver a nota no topo do arquivo sobre a
          hierarquia: largura inteira e fundo escuro são a recomendação
          estratégica do briefing traduzida em layout. */}
      <div className="mt-5 overflow-hidden rounded-card bg-petroleo text-areia">
        <div className="p-8 md:p-12">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">
            Bloco 03 · o motor
          </p>
          <h3 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Organizadores
          </h3>
          <p className="mt-4 max-w-2xl leading-relaxed text-areia/80">
            É aqui que a oferta da cidade nasce — sem organizador, os outros
            dois blocos ficam bonitos e vazios. E organizador é gente de dois
            tipos muito diferentes, então são duas portas.
          </p>

          {/* ITEM 4.1 RESOLVIDO: as DUAS portas, explícitas.
              Ver a nota no topo do arquivo sobre por que não é uma copy
              "que serve pros dois". */}
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {TRILHAS.map((t) => (
              <div
                key={t.id}
                className="flex flex-col rounded-card border border-areia/15 bg-areia/5 p-7"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">
                  {t.etiqueta}
                </p>
                <h4 className="mt-2.5 font-display text-2xl font-extrabold tracking-tight">
                  {t.titulo}
                </h4>
                <p className="mt-1.5 text-sm text-areia/60">{t.quem}</p>

                <ul className="mt-6 flex-1 space-y-3">
                  {t.itens.map(([titulo, texto]) => (
                    <li key={titulo} className="flex gap-3">
                      <span aria-hidden className="mt-1 shrink-0 text-lime">
                        ✓
                      </span>
                      <span>
                        <span className="font-semibold">{titulo}</span>
                        <span className="block text-sm leading-relaxed text-areia/70">
                          {texto}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={t.href}
                  className={`mt-7 inline-block self-start rounded-full px-6 py-3 font-semibold transition-colors ${
                    t.primaria
                      ? "bg-lime text-petroleo hover:opacity-90"
                      : "border-2 border-areia/30 text-areia hover:border-lime hover:text-lime"
                  }`}
                >
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Item 5 — Cursos. Declarado, sem link: a página não existe. */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-card border border-dashed border-petroleo/25 px-8 py-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-petroleo/50">
            Próximo no roadmap
          </p>
          <p className="mt-1.5 font-display text-xl font-bold">
            Cursos <span className="text-petroleo/40">· em breve</span>
          </p>
        </div>
        <p className="max-w-md text-sm text-petroleo/60">
          Formação e workshop dentro da plataforma, pra quem quer ensinar e pra
          quem quer aprender. Entra depois que Organizadores estiver redondo.
        </p>
      </div>
    </section>
  );
}
