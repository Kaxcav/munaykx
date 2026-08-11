# QUADRO-SHADCN-MUNAY — adotar o shadcn/ui como design system do site inteiro

**Aberto em 11/08/2026.** Decisão do dono: **a paleta atual FICA.** Nenhum
hex de PDF de branding entra aqui. O que muda é a *disciplina* — cada tela ou
é peça do padrão, ou não existe. A cor continua saindo de `lib/brand.ts`,
como já sai.

**Base:** `origin/main` = `c28e54d`. **Método:** o playbook
*"shadcn com essência"* (F0 → higiene → peças → estrutura → brilho), com
execução em **lotes disjuntos por pasta**.

**A régua de pronto é uma pergunta:** *essa tela parece irmã da `/mapa`?*
A `/mapa` é a tela-referência porque foi a última construída inteira dentro do
padrão. O que ela faz e toda tela deve repetir: `eyebrow` mono → `h1` display
→ descrição de uma frase → conteúdo em `max-w-6xl px-5 py-20` → seções
laterais abertas por `eyebrow` → régua final `border-petroleo/10 pt-8`.

---

## 1. F0 — fundação (FEITA, PR desta rodada)

A MUNAY já tinha metade da F0 pronta antes desta rodada. O que **existia**:

| Item da F0 | Estado ao abrir | Onde |
|---|---|---|
| Formato único de token | ✅ HSL `H S% L%`, gerado de `lib/brand.ts` | `app/globals.css` |
| Aliases do registry → marca | ✅ os 10 (`primary`, `card`, `muted`, `accent`, `popover`, `input`, `ring`, `secondary`, `border`, `destructive`) | `tailwind.config.ts` |
| Raio | ✅ `--radius: 0.75rem` + `rounded-card` (1.5rem) da marca | `app/globals.css` |
| Trava tema ↔ marca | ✅ `tests/tema.spec.ts` compara o CSS com o cálculo de `lib/tema.ts` | CI |
| `cn()` | ✅ | `lib/utils.ts` |
| Fonte | ✅ display/sans/mono por `<link>` | `app/layout.tsx` |
| Peças | ✅ 7: Button · Input · Badge · Card · Table · Sheet · ScrollArea | `components/ui/` |

O que **faltava** — e entrou nesta rodada:

1. **Quarentena da CLI.** O `components.json` mandava o `npx shadcn add` escrever
   direto em `components/ui/` e ainda vinha com `cssVariables: true`. Ou seja:
   um `add button` apagaria o `hover:bg-lime` e o raio de pílula da marca, e um
   `add` qualquer reescreveria o bloco `:root` do `globals.css` — que é
   **calculado** de `lib/brand.ts` e vigiado pelo `tests/tema.spec.ts`. A CLI
   teria deixado o CI vermelho e trocado a paleta por `neutral`.
   → agora `aliases.ui` aponta pra `components/registry/` (quarentena,
   gitignorada) e `cssVariables: false`. Fluxo em `components/registry/LEIA-ME.md`.
2. **`npm run verificar:classes`.** O registry é Tailwind v4; a MUNAY é 3.4.
   `shadow-xs`, `outline-hidden`, `ring-3`, `w-(--x)`, `oklch()` **não quebram o
   build** — o Tailwind 3.4 só não gera regra nenhuma e a peça renderiza errada
   pra sempre, em silêncio. O script recusa (sai 1) e diz a substituição.
3. **`npm run verificar:higiene` + baseline numérico.** Conta cinco dívidas e
   **nenhuma pode subir**. Lote que derruba um número roda
   `npm run verificar:higiene -- --atualizar` e commita o baseline novo **no
   mesmo PR** — é o que trava o ganho.
4. **Os dois no CI**, antes do typecheck (`.github/workflows/ci.yml`).

### Baseline medido em 11/08/2026 (`c28e54d`)

| Contador | Valor | Leitura |
|---|---|---|
| `cor-hex` | 39 | 7 no `PlanoPiloto` (SVG procedural) + 32 nos estilos de basemap (`lib/mapa-temas.ts`, `lib/mapa-estilo.ts`) |
| `cor-paleta-crua` | **0** | nenhum `bg-blue-100` no projeto inteiro |
| `dark-manual` | **0** | nenhum `dark:` escrito à mão |
| `controle-cru` | **171** | `<button>`/`<input>`/`<select>`/`<textarea>` fora do DS — **a dívida real** |
| `superficie-a-mao` | **93** | card montado com `rounded-* + border/bg` em vez de `<Card>` |
| adoção do DS | **12/103** | arquivos `.tsx` que importam `components/ui` |

**O diagnóstico em uma frase:** a cor já estava sob controle (é o que a regra 4
do `CLAUDE.md` vem segurando desde o dia 1) — a dívida da MUNAY é **estrutural**:
171 controles nativos e 93 superfícies à mão espalhados por 43 rotas, com o DS
usado em 12% dos arquivos. Por isso o guardrail conta controle e superfície, e
não só cor: um guardrail só de cor ficaria verde pra sempre sem medir nada.

**Decisão sobre os 39 hex:** ficam contados, não isentos. Os 32 de basemap são
paleta de mapa (MapLibre, não Tailwind) e serão tokenizados no Lote 7 — mantê-los
na conta é o que impede o número de crescer enquanto isso.

**O que o L7 fez com eles (11/08):** 39 → **29**. Tokenizar aqui NÃO era derivar
de `lib/brand.ts` — a paleta cartográfica ser própria é decisão registrada, e
tomada justamente depois de o feedback reprovar o basemap tingido pela marca
("ficou lamacento"). Tokenizar era **dar nome e matar a duplicata**: 29
ocorrências viraram 20 tons declarados uma vez cada, em `PALETA`
(`lib/mapa-temas.ts`), mais o branco das vias em `lib/mapa-estilo.ts`. O basemap
não mudou um pixel — assinatura do estilo gerado medida antes e depois: mesmo
hash, 67 camadas, 32 cores. Os 20 continuam **contados, não isentos**: cor de
MapLibre é `paint` de camada, não passa por Tailwind e não tem alias de token —
está contida, não resolvida.

---

## 2. Os lotes

**Disjuntos por PASTA**, não por intenção — é o que permite rodar em paralelo
sem `git` brigando. A coluna "dono dos arquivos" é literal: **só o lote dono
edita aquela pasta.**

| # | Lote | Pastas que ele possui | Peso | Depende de |
|---|---|---|---|---|
| **F0** | Fundação | `components.json` · `scripts/verificar-*` · `.github/workflows/ci.yml` · `components/registry/` | feito | — |
| **L1** | **Compartilhados + casca + descoberta pública** | `components/ui/**` · `components/comum/**` (novo) · `Header` `HeaderSimples` `SairButton` · `app/comunidades/**` · `app/descobrir/**` · `components/BuscaIA.tsx` | grande | F0 |
| **L2** | Evento + RSVP + agenda | `app/eventos/**` · `app/rsvp/**` · `app/agenda/**` · `app/c/**` · `RsvpForm` `CancelarInscricao` `Ingresso` `CompartilharBotoes` `GuiaIniciantePublico` | médio | L1 |
| **L3** | Painel do organizador | `app/painel/**` · `components/painel/**` | **o maior** (~40 controles crus) | L1 |
| **L4** | Admin | `app/admin/**` · `components/admin/**` | grande (~46 controles crus) | L1 |
| **L5** | Área do usuário | `app/perfil/**` · `app/minhas-*/**` · `app/meus-ingressos/**` · `app/entrar/**` · `app/convite/**` · `app/descadastrar/**` · `components/perfil/**` · `EntrarForm` `ConfirmarEntrada` `SairButton` | médio | L1 |
| **L6** | Landing + institucional | `app/page.tsx` · `app/privacidade/**` · `app/semana/**` · `Hero` `Publicos` `ComoFunciona` `Mosaico` `PainelFuncional` `LeadSection` `MidiaPlaceholder` `FeedAvisos` `CorpoAviso` `Vitrine` `Footer` | médio | L1 |
| **L7** | Mapa | `lib/mapa-temas.ts` · `lib/mapa-estilo.ts` · `MapaDF` `MapaMapLibre` `MapaTelaCheia` `EixoDeTempo` · `app/mapa/**` | pequeno | L1 |

### Por que o L1 roda SOZINHO

Ele é o **único dono de `components/ui/**` e `components/comum/**`**. Se dois
lotes criassem componente compartilhado ao mesmo tempo, teríamos duas versões
de "cabeçalho de seção" e o conflito seria de merge *e* de design. Com o L1 no
ar, L2…L7 correm **em paralelo** e nenhum deles toca `components/ui/`.

Precisou de peça compartilhada nova no meio de um lote? **Não crie.** Anote no
§5 (pedidos entre frentes) e siga com o resto do lote.

### O que o L1 entrega pros outros usarem

`components/comum/` — a casca que codifica a régua da `/mapa`:

- **`<Pagina>`** — container padrão: `eyebrow` + `h1` display + descrição + slot
  de ações, em `mx-auto max-w-6xl px-5 py-20`. Toda tela abre com ele.
- **`<Secao>`** — cabeçalho de seção com `eyebrow` (mata os `<h2 className="…">`
  avulsos).
- **`<EstadoVazio>`** — título + linha + CTA. Hoje cada tela escreve o seu.
- **`<EstadoErro>`** — usado pelos `error.tsx` (são 4, todos com `<button>` cru
  e copy diferente).

- **`<CardComunidade>`** — o cartão da descoberta. Estava duplicado palavra
  por palavra entre `/comunidades` e `/descobrir`, e as cópias já tinham
  divergido: só uma mostrava o selo "acolhe iniciantes".

`components/ui/` ganhou o que a descoberta precisava e o resto vai reusar:
**`Chip`/`ChipBotao`** (a pílula de filtro, que estava escrita à mão oito
vezes), **`Label`** e **`Textarea`**. O `SelectNativo` já existia no
`ui/input.tsx` — nativo estilizado, não Radix, pra não virar client component
dentro de formulário em server action.

### As duas mudanças visuais do L1 (deliberadas, e só estas)

Nenhuma cor da paleta mudou — `lib/brand.ts` segue intocado, e chip ativo,
título, espaçamento e tipografia batem pixel a pixel com o que estava no ar
(conferido com `getComputedStyle` na build de produção). O que muda é o
cartão, porque agora ele é o `<Card>` do DS em vez de seis classes copiadas:

| | antes (à mão) | agora (`<Card>`) |
|---|---|---|
| fundo | `bg-white/70` sobre areia | `--card` = branco sólido |
| borda | `border-petroleo/10` | `--border` (mistura areia×petróleo 0.14) |

Ambos os valores continuam derivando de `lib/brand.ts` por `lib/tema.ts` — é
o mesmo cartão que o `/admin` e a `/mapa` já usam. O efeito é o cartão
destacar um fio a mais do fundo. Se o PO preferir o cartão mais "lavado", a
troca é em `lib/tema.ts` (um arquivo), não nas telas.

---

## 3. Ordem sugerida depois do L1

Por impacto, não por conforto: **L4 (admin)** e **L3 (painel)** primeiro — são
76 dos 171 controles crus e as telas onde o organizador trabalha. Depois L5, L2,
L6, L7.

**L5 fechado em 11/08.** A área do usuário entregou os 30 itens de dívida que
tinha para entregar. Os 6 que restam têm dono e nome: **4 são falso positivo do
grep** (a palavra `<input>`/`<button>`/`<select>` dentro de comentário que
explica por que NÃO usar o elemento solto, em `app/perfil/page.tsx`,
`components/perfil/Campo.tsx` e `SeletorInteresses.tsx` duas vezes) e **2 são a
caixa de marcar e a chave de consentimento**, que esperam o `<Checkbox>` do §5.
Mesma postura do L4: não reescrevi comentário pra baixar contador — o conserto
certo é o script pular comentário, e isso é lote do F0. O pedido está no §5, com
a receita pronta (`semComentarios()` em `tests/usuario-ds.spec.ts`).

**L2 fechado em 11/08.** Entregou 11 dos 12 controles crus e as 11 superfícies
à mão. O que sobra é UM: o honeypot anti-spam do `RsvpForm`, que só funciona se
o bot ler um campo comum — vesti-lo com as classes do `<Input>` (`h-11
rounded-full`) seria estilizar um elemento que ninguém enxerga só pra baixar o
contador, e o `CLAUDE.md` já avisa que aquilo não é bug. A isenção está amarrada
por ARQUIVO no `tests/evento-ds.spec.ts`: um segundo controle cru em qualquer
outra tela do lote deixa o teste vermelho.

**L4 fechado em 11/08.** O admin entregou 37 dos 47 controles crus que tinha; os
10 que sobram têm dono: **6 são caixa de marcar** (esperam o `<Checkbox>` do §5)
e **4 são falso positivo do grep** — a palavra `<button>`/`<select>` escrita
dentro de comentário de documentação em `Paginacao.tsx`, `SeletorEvento.tsx`
(duas) e `CommunityForm.tsx`. Esses três arquivos já são 100% DS no código.
Não reescrevi o comentário alheio pra baixar o número: mexer em texto só pra
agradar o contador é o jeito curto de transformar guardrail em teatro. Se o F0
quiser resolver, o conserto certo é o script pular comentário — e isso é lote
dele, não meu.

---

## 4. Regras da rodada (não negociáveis)

1. **1 lote = 1 worktree = 1 branch = 1 banco = 1 porta.** Receita no
   `CLAUDE.md` § "Trabalhar em paralelo". Duas janelas na mesma pasta foi o
   `index.lock` de 06/08.
2. **Fique no seu lote.** Arquivo fora das suas pastas não se toca — vira pedido
   no §5.
3. **`npm run verificar` verde antes de todo push.** Baseline nunca sobe; quando
   cair, `-- --atualizar` e o baseline vai no mesmo PR.
4. **1 lote = 1 PR pequeno e reversível.** Merge = deploy no Railway; nada de
   big bang.
5. **Zero lógica alterada.** Isto é migração de superfície. Query, action,
   validação Zod e regra de negócio ficam byte a byte iguais — se um teste de
   comportamento mudar, você saiu do escopo.
6. **A API pública é da MUNAY.** As peças de `components/ui` já falam a língua
   do produto. Não quebre a assinatura de um componente existente "porque o
   registry é assim".
7. **Checklist de tela nos 12 itens** (§6) antes de abrir o PR.

---

## 5. Pedidos entre frentes

Componente compartilhado que faltou no meio de um lote entra aqui. Só o dono do
L1 implementa.

| Quem pediu | O quê | Estado |
|---|---|---|
| L3 (painel) + L4 (admin) | **`<Checkbox>` em `components/ui/`** — caixa de marcar. **As duas frentes pediram a mesma peça, sem se falar** (o admin tem 6: `ativo`, `demo`, `gratuito` nos dois formulários e o aviso de lançamento; o painel tem 6: `ativo`, `acolheIniciante`, `gratuito` x2, `modoRota` e o aceite de autorização; e o L5 vai ter mais, no consentimento do `/perfil`). É a evidência de que a peça faz falta de verdade, e não é gosto de um lote. **Não dá pra reusar `<Input>`**: ele é `h-11 w-full rounded-full`, desenhado pra campo de texto — numa caixa de 16px isso não é ajuste de classe, é outra peça. Enquanto não existir, os 12 continuam contados como controle cru, de propósito; no painel eles estão concentrados num arquivo só (`components/painel/Campo.tsx` → `<CampoCheck>`), então a troca lá é de uma linha. | **aberto** — só o dono do L1 implementa |
| L3 (painel) | **Promover `<Campo>` e `<Aviso>` de `components/painel/` pra `components/comum/`.** `<Campo>` é rótulo+controle+dica (matou 23 cópias em 3 dialetos); `<Aviso>` é a faixa de `?ok=`/`?erro=` (matou 15 cópias em 4 receitas). O L4 já resolveu as mesmas duas dívidas do lado dele, e o L5 vai encontrar de novo — se cada lote escrever a sua, a rodada acaba com três "cabeçalho de campo" diferentes, que é exatamente o que ela existe pra matar. **Não copie: peça a promoção.** | aberto |
| L2 (evento) | **`asChild` no `<Card>`** (Slot do Radix, como o `<Button>` do registry faz). O `<Card>` é `<div>` fixa, e a `/agenda` tem DUAS listas onde o card É o item semântico: o aviso é `<article>` e o evento é `<li>` dentro de `<ul>`. Sem `asChild` a saída é `<li><Card>…</Card></li>` — funciona e foi o que entrou, mas empilha uma `<div>` por item e, no caso do `<article>`, faz a região do leitor de tela e a superfície visual serem caixas diferentes. Não é bloqueio: é a diferença entre a peça servir a lista e a lista contornar a peça. O L5 (`/minhas-inscricoes`, `/meus-ingressos`) vai bater no mesmo. | **aberto** — só o dono do L1 implementa |
| L2 (evento) | **Uma `<Secao>` que aceite eyebrow E chamada display juntos.** Hoje é ou/ou: `destaque={false}` dá `eyebrow` + descrição em `text-sm`, `destaque` dá `h2` display sem eyebrow. A `/eventos/[slug]` precisava dos dois (eyebrow "Confirmar presença" + a chamada "Garante sua vaga…"), e a saída foi manter a chamada como `<p>` display dentro da seção. Ficou correto e o esqueleto de heading até melhorou — mas é o tipo de coisa que, repetida em quatro telas por quatro lotes, volta a virar quatro dialetos. | aberto |
| L6 (landing) | **Promover `components/landing/Escuro.tsx` pra `components/comum/`** — o vocabulário de superfície ESCURA (`CARD_ESCURO`, `BLOCO_ESCURO`, `CONTROLE_ESCURO`, `BOTAO_LIME`, `<CampoEscuro>`). O DS inteiro assume fundo claro (`<Card>` é `bg-card`, `<Input>` é `bg-card`), e a landing tem três blocos petróleo por decisão de briefing: o card B2B do `<Publicos>`, o Bloco 03 do `<PainelFuncional>` e a dobra de cadastro. **O L5 vai encontrar o mesmo**: a `/meus-ingressos` é "tela escura, densa e verde, de propósito o oposto do resto do site" (STORY-011). Se cada lote escrever o seu, a rodada acaba com duas gramáticas de escuro — que é o defeito que ela existe pra matar. **Não é `dark:`**: o contador `dark-manual` é ZERO de propósito, porque a MUNAY não tem tema por preferência do sistema, tem blocos escuros deliberados. | **aberto** — só o dono do L1 implementa |
| L7 (mapa) | **Fazer o `verificar:higiene` pular COMENTÁRIO.** Não é conveniência: hoje o contador `controle-cru` conta a tag citada num JSDoc (`EixoDeTempo.tsx` explica por que o slider é `<input type="range">` nativo) e o `cor-hex` conta hex escrito em prosa. Nos dois casos o incentivo que isso cria é errado — ou você apaga a explicação, ou reescreve o texto pra driblar o contador, e as duas coisas pioram o código pra melhorar o número. O L4 já esbarrou nisso em três arquivos e, com razão, não mexeu no comentário alheio. É lote do F0 (`scripts/verificar-*` é dele). Enquanto não existir, as ocorrências ficam contadas e nomeadas nos specs de lote. | aberto — só o dono do F0 |
| L3 (painel) | **`tabular-nums` no valor do `<CardNumero>`.** O relatório pós-evento usa a peça em grade de 4 colunas; sem números tabulares os valores dançam de linha em linha (checklist item 6). Uma classe, em `components/ui/card.tsx`. | aberto |
| **L5 (área do usuário)** | **Reforço do pedido de `<Checkbox>` — TERCEIRA frente a esbarrar.** O `/perfil` tem duas caixas nativas: a de "perfil público" e a chave (`role="switch"`) do consentimento LGPD. Elas ficam contadas de propósito, num arquivo só (`components/perfil/PerfilForm.tsx`), com o número TRAVADO em 2 por `tests/usuario-ds.spec.ts`. **Atenção pra quem for implementar:** a chave de consentimento **não** é o mesmo componente da caixa — ela é `<input type="checkbox">` real só escondido visualmente, e é isso que faz o `<label>` envolvente dar nome acessível e o autofill do navegador funcionar. Se o `<Checkbox>` nascer como div com `role="checkbox"`, ele resolve o L3/L4 e **não** resolve a chave do L5. | aberto |
| **L5 (área do usuário)** | **`<Secao>` aceitar `id` (e repassar `aria-labelledby` na `<section>`).** As cinco seções do `PerfilForm` são `<section aria-labelledby="sec-…">` com `<h2 id="sec-…">` — o vínculo é o que faz o leitor de tela anunciar "Você no controle, região". Como o `<Secao>` do L1 não expõe `id`, adotar a peça ali significaria **perder** acessibilidade, então mantive os `<h2>` locais e só tokenizei a cor. Duas props, sem mudança visual. | aberto |
| **L5 (área do usuário)** | **`verificar:higiene` deveria pular COMENTÁRIO** (pedido pro F0, dono de `scripts/`). Dos 22 controles crus que ele acusa na raia do L5, **4 são a palavra `<input>`/`<button>`/`<select>` escrita dentro de documentação** que explica por que o elemento não deve ser usado solto. O L4 já tinha registrado o mesmo em `Paginacao.tsx`/`SeletorEvento.tsx`/`CommunityForm.tsx`; com o L5 são 8 falsos positivos no total, e o número só cresce conforme os lotes documentam suas decisões. Enquanto isso, o teste local do L5 já varre com os comentários removidos — a receita está lá (`semComentarios()`), são 5 linhas. | aberto |

---

## 6. Checklist de tela (os 12)

1. ☐ Usa o container `<Pagina>` (eyebrow + h1 + descrição + ações)?
2. ☐ Zero `<button>` `<input>` `<select>` `<textarea>` crus — tudo `ui/*`?
   (`<input type="hidden">` é isento: não tem visual.)
3. ☐ Zero superfície-card à mão — todo container é `<Card>`?
4. ☐ Zero cor fora de token (`npm run verificar:higiene` não subiu)?
5. ☐ `lime` só como acento RARO (um destaque por dobra, foco, sucesso);
   quem cobre área é `salvia`. Status usa a paleta semântica, nunca a de marca.
6. ☐ Hierarquia tipográfica: `h1` só do `<Pagina>`, seção via `<Secao>`,
   `tabular-nums` em número/contador/data?
7. ☐ Pill e contador são `<Badge>`; dropdown/popover são Radix, nunca
   `div absolute` com click-outside à mão?
8. ☐ Estados completos: vazio com CTA, erro com retry, carregando quando existe?
9. ☐ Ação destrutiva confirma antes (nunca `window.confirm`)?
10. ☐ Filtro/busca/aba refletidos na **URL** (a `/comunidades` já faz — não
    regrida isso), lista com paginação real?
11. ☐ Motion ≤300ms e nada animado em dado que atualiza sozinho?
12. ☐ **Parece irmã da `/mapa`?**

---

## 7. Checklist de port (registry → MUNAY)

1. ☐ `npx shadcn@latest add X` caiu em `components/registry/` (quarentena)?
2. ☐ Substituições de versão: `outline-hidden`→`outline-none` ·
   `shadow-xs`→`shadow-sm` · `rounded-xs`→`rounded-sm` · `ring-3`→`ring-[3px]` ·
   `w-(--x)`→`w-[var(--x)]` · `--spacing(N)`→rem literal · `**:`→`[&_*]:` ·
   `has-focus:`→`has-[:focus]:` · `size-8!`→`!size-8`.
   **`npm run verificar:classes` é o portão mecânico disso.**
3. ☐ `forwardRef` reintroduzido onde o Radix usa `asChild`? (A MUNAY está no
   React 19, onde `ref` é prop normal — mas peça copiada do registry v4 pode vir
   sem, e aí o `asChild` perde a ref em silêncio.)
4. ☐ Import `radix-ui` → `@radix-ui/react-*`; `data-slot` preservado?
5. ☐ Cor apontando pros aliases do `tailwind.config.ts` — nenhum `hsl(var(--…))`
   de fora sobrou?
6. ☐ API traduzida pro português do produto, arquivo movido pra
   `components/ui/`, quarentena limpa?
7. ☐ `npm run verificar` + `npm run build` verdes?

---

## 8. Estado dos lotes

Atualizado por quem executa, no próprio PR.

| Lote | Worktree · branch | Estado | Nota |
|---|---|---|---|
| F0 + L1 | `C:\munay-043` · `feat/shadcn-fundacao` | **entregue** | 584 testes verdes (8 novos), build e guardrails verdes. Baseline: controle-cru 171→165, superfície-à-mão 93→84, adoção 12→21 arquivos |
| **L3 · Painel** | `C:\munay-045` · `feat/shadcn-l3-painel` | **entregue** | 11 telas + 9 componentes. Dívida do lote: **108 → 1** (67 controles crus → 1, 41 superfícies à mão → 0). 588 testes verdes (4 novos, `tests/painel-ds.spec.ts`). Três pedidos no §5. |
| **L4 · Admin** | `C:\munay-044` · `feat/shadcn-l4-admin` | **entregue** | 600 testes verdes (16 novos), build/lint/typecheck e guardrails verdes. 11 rotas + 6 componentes migrados. Pedido de `<Checkbox>` aberto no §5. |
| **L5 · Área do usuário** | `C:\munay-048` · `feat/shadcn-l5-usuario` | **entregue** | 9 telas + 4 componentes de perfil + `EntrarForm`/`ConfirmarEntrada`. Dívida do lote: **36 → 6** (22 controles crus → 6, dos quais **4 são comentário** e 2 são a isenção de caixa/chave; 14 superfícies à mão → 0). 616 testes verdes (12 novos, `tests/usuario-ds.spec.ts`). Três pedidos no §5. Achado: bug de layout PRÉ-EXISTENTE (37px de overflow em 375px na `/minhas-comunidades`) medido em `b50c4d7` e consertado — desvio confessado no próprio arquivo |
| **L2 · Evento + RSVP + agenda** | `C:\munay-046` · `feat/shadcn-l2-evento` | **entregue** | 8 telas + 5 componentes. Dívida do lote: **23 → 1** (12 controles crus → 1, 11 superfícies à mão → 0). 612 testes verdes (7 novos, `tests/evento-ds.spec.ts`), 4 deles validados VERMELHOS contra a `main` antes de entrar. Um pedido novo no §5. |
| **L6 · Landing + institucional** | `C:\munay-047` · `feat/shadcn-l6-landing` | **entregue** | 12 componentes + 3 telas. Dívida do lote: **24 → 1** (11 controles crus → 1, o honeypot anti-spam; 13 superfícies à mão → 0). `tests/landing-ds.spec.ts` (11 novos, 7 prova + 4 guarda), rodados contra a `main` antes de entrar: 8 vermelhos, 3 verdes. Um pedido no §5 (promover `landing/Escuro.tsx`). |
| **L7 · Mapa** | `C:\munay-049` · `feat/shadcn-l7-mapa` | **entregue** | 630 testes verdes (7 novos, `tests/mapa-ds.spec.ts`), build/lint/typecheck e guardrails verdes. `cor-hex` **39 → 29** (a tokenização do basemap que o §1 deixou marcada), `controle-cru` 62 → 61, `superfície-à-mão` 41 → 39, adoção 50 → 52. Duas mudanças visuais declaradas abaixo. |

**RODADA FECHADA.** O L7 era o último. Do começo ao fim, medido pelo mesmo
guardrail: `controle-cru` **171 → 29**, `superficie-a-mao` **93 → 1**, `cor-hex`
**39 → 29**, adoção do DS **12/103 → 83/113**. Nenhum lote tocou pasta fora da
própria raia, e os três pedidos abertos no §5 seguem abertos — são do L1 e do
F0, e ficam pra quem for dono deles.

### As duas mudanças visuais do L7 (deliberadas, e só estas)

Nenhuma cor da paleta mudou, e o basemap está byte a byte igual. O que muda:

| | antes (à mão) | agora (peça do DS) |
|---|---|---|
| `h1` da `/mapa` no desktop | `sm:text-5xl` | `sm:text-4xl` — é o que o `<Pagina>` do L1 codificou |
| painel do eixo de tempo | `bg-white/60` sobre areia | `<Card>` = `--card` (branco sólido) + `--border` |

A primeira merece nota. A `/mapa` é a **tela-referência** da rodada, e agora foi
ela que teve de ceder um ponto pra caber no container que ela mesma inspirou. É
o certo: uma tela não pode ser a régua **e** a exceção à régua. Se o PO preferir
o título maior, a troca é no `<Pagina>` — um arquivo, todas as telas.

Fora isso, o chip de dia da semana passou a usar `chipVariants` e ficou
pixel-idêntico no estado ativo (`bg-primary` = petróleo, `text-primary-foreground`
= areia, `8px 16px` de padding, peso 600 — tudo conferido com `getComputedStyle`
na build); só a borda do inativo foi de `petroleo/20` pra `primary/15`.

**Baseline depois de L1+L2+L3+L4+L5+L6** — recontado no merge, e este é o
procedimento, não um detalhe: lotes paralelos derrubam contadores DIFERENTES, e
resolver o conflito com `--ours`/`--theirs` gravaria um número errado, deixando
teto frouxo pro lote seguinte. O certo é `-- --atualizar` DEPOIS do merge.
Números de 11/08, com o L5 dentro:

| Contador | Abertura (`c28e54d`) | Agora | Falta |
|---|---|---|---|
| `controle-cru` | 171 | **30** | −141 (82%) |
| `superficie-a-mao` | 93 | **3** | −90 (97%) |
| adoção do DS | 12/103 | **81/113** | de 12% pra 72% dos arquivos |
| `cor-hex` · `cor-paleta-crua` · `dark-manual` | 39 · 0 · 0 | 39 · 0 · 0 | intocados, como planejado |

Fonte viva: `scripts/baseline-higiene.json`. Sobra só o **L7 (mapa)**, que é
onde moram 32 dos 39 hex.

**Baseline depois do L2 + L6:** `controle-cru` 62 → **41** ·
`superficie-a-mao` 41 → **17** · adoção 50 → **70** dos 113 arquivos.

E a colisão prevista pelo L3 aconteceu de novo, igualzinha: o **L2 mergeou no
meio do PR do L6**, e os dois arquivos compartilhados
(`scripts/baseline-higiene.json` e este quadro) conflitaram no rebase. A regra
se confirmou pela segunda vez: **o baseline não se resolve escolhendo um
lado** — o L6 media 52/28 sozinho e o L2 media 51/30 sozinho; qualquer um dos
dois números deixaria teto frouxo pro próximo lote. O certo é pegar a versão
da `main`, **recontar** (`-- --atualizar`) e commitar o resultado. Vale
também pro L5 e pro L7.

**Coordenação:** claim e diário em `C:\munay-site\docs\comunicacao\`
(`S-shadcn.md`), conforme `docs/PROTOCOLO-sessoes.md`. As três frentes de
retenção (aviso de lançamento, véspera, relatório pós-evento) foram conferidas
em 11/08: **todas já mergeadas em `origin/main` `c28e54d`**, diff vazio contra
a base — nenhuma colisão viva com este quadro.
