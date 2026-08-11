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
| L3 (painel) | **`Checkbox` em `components/ui/`.** É o único controle nativo que sobrou no painel inteiro (6 caixas de marcar, hoje concentradas num arquivo: `components/painel/Campo.tsx` → `<CampoCheck>`). O L3 NÃO criou a peça porque `components/ui/**` é do L1. Quando existir, é só trocar dentro do `CampoCheck` — as seis telas não mudam. | aberto |
| L3 (painel) | **Promover `<Campo>` e `<Aviso>` de `components/painel/` pra `components/comum/`.** `<Campo>` é rótulo+controle+dica (matou 23 cópias em 3 dialetos); `<Aviso>` é a faixa de `?ok=`/`?erro=` (matou 15 cópias em 4 receitas). O L4 (admin) e o L5 (área do usuário) têm exatamente as mesmas duas dívidas — se cada lote escrever a sua, a rodada acaba com três "cabeçalho de campo" diferentes. **Não copie: peça a promoção.** | aberto |
| L3 (painel) | **`tabular-nums` no valor do `<CardNumero>`.** O relatório pós-evento usa a peça em grade de 4 colunas; sem números tabulares os valores dançam de linha em linha (checklist item 6). Uma classe, em `components/ui/card.tsx`. | aberto |

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
| **L3** | `C:\munay-045` · `feat/shadcn-l3-painel` | **entregue** | 11 telas + 9 componentes. Dívida do lote: **108 → 1** (67 controles crus → 1, 41 superfícies à mão → 0). Baseline global: controle-cru 165→**99**, superfície-à-mão 84→**43**, adoção 21→**42** arquivos. 588 testes verdes (4 novos, `tests/painel-ds.spec.ts`). Três pedidos no §5. |
| L2 · L4…L7 | — | livre | podem abrir em paralelo: o L1 mergeou e é o único dono de `components/ui/**` e `components/comum/**` |

**Coordenação:** claim e diário em `C:\munay-site\docs\comunicacao\`
(`S-shadcn.md`), conforme `docs/PROTOCOLO-sessoes.md`. As três frentes de
retenção (aviso de lançamento, véspera, relatório pós-evento) foram conferidas
em 11/08: **todas já mergeadas em `origin/main` `c28e54d`**, diff vazio contra
a base — nenhuma colisão viva com este quadro.
