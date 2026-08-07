# STORY-011 · Briefing do PO — landing, área do usuário e rodapé

**Repo:** munay-site · **Executor:** Claude (Cowork) · **Review/merge:** Kaxcav
**Branch sugerida:** `feat/briefing-mateus` a partir da `main` (`57ded3f`).
**Tipo: EXECUTADA.** Escrita e implementada em 07/08/2026.
**Origem:** `MUNAY Briefing Landing Page.docx`, ditado pelo Mateus (PO).

---

## ⚠️ Desvio confessado — leia isto antes do resto

O `CLAUDE.md` fecha com: *"Anti-meta: nenhuma feature nova fora disso antes da
Etapa 2 (03/09); construção pesada é pós-resultado (15/10), como escopo
financiável."* E as STORY-008/009/010 dizem, cada uma, "**São specs: a execução
é ONDA 2**".

**A Parte II deste briefing (itens 8 a 12 — perfil, CPF, inteligência de
consumo, ingressos) é exatamente essa construção pesada, e foi executada
assim mesmo.**

O que aconteceu: a alternativa recomendada era codar só a Parte I (landing) e a
Parte III (rodapé) e transformar a Parte II em spec. **O Kaxcav escolheu
explicitamente executar tudo**, ciente de que fura o anti-meta. Registrado
aqui porque desvio silencioso é o que a regra 6 proíbe — desvio decidido e
escrito é o que ela permite.

O que foi feito pra reduzir o custo do desvio:

- **Nada de irreversível.** A migração só ACRESCENTA colunas anuláveis em
  `users`. Não altera coluna existente, não apaga nada, não muda contrato de
  API. Reverter é um `ALTER TABLE DROP COLUMN`, se um dia for o caso.
- **A parte cara ficou de fora.** O item 10.1 (produto de dados vendável pra
  terceiros) NÃO foi implementado — ver a seção de LGPD abaixo.
- **Zero dependência nova.** Nenhum pacote entrou no `package.json`. O bundle
  do site público não cresceu; só a `/perfil` (18,9 kB, e ela é privada).

---

## O que entrou, item por item

O briefing tem 13 itens. Os treze foram endereçados — alguns em código, alguns
em decisão registrada, e três em pendência que depende de dado que não existe.

### Parte I — Landing page

| # | Pedido | Estado | Onde |
|---|---|---|---|
| 1 | Remover a frase de categorias | ✅ código | `components/Hero.tsx` |
| 2 | Seção de fotos/feed/vídeos estilo NOW Festival | ⚠️ estrutura pronta, sem mídia real | `components/Mosaico.tsx`, `lib/midia.ts` |
| 3 | Colorir os cards de "Brasília treina todo dia" | ✅ código | `lib/modalidades.ts`, `components/Vitrine.tsx` |
| 4 | Painel funcional em 3 blocos | ✅ código | `components/PainelFuncional.tsx` |
| 4.1 | Definir B2B ou B2S | ✅ **decidido: os dois** | `components/PainelFuncional.tsx` |
| 5 | Cursos no roadmap | ✅ declarado, sem link | `components/PainelFuncional.tsx` |
| 6 | Mais verde sálvia | ✅ código | `lib/brand.ts` (token novo) |
| 7 | Tom de voz descolado | ✅ código | Hero, ComoFunciona, Publicos, Vitrine, Mosaico |

### Parte II — Área do usuário

| # | Pedido | Estado | Onde |
|---|---|---|---|
| 8.1 | Dados cadastrais | ✅ código | `/perfil`, migração `20260807120000` |
| 8.2 | Camada de personalidade | ✅ código | `lib/perfil-perguntas.ts` |
| 8.3 | Usabilidade + painel de ajuda | ✅ código | `components/perfil/PainelAjuda.tsx` |
| 9 | Minhas Inscrições com chips | ✅ código | `/minhas-inscricoes`, `lib/inscricoes.ts` |
| 10 | Inteligência de consumo | ⚠️ parcial | `lib/inteligencia.ts` |
| 10.1 | Produto de dados pra terceiros | ⛔ **NÃO implementado** | ver LGPD abaixo |
| 11 | Perfil público | ✅ código | `/perfil` |
| 11.1 | Tags de interesse | ✅ código | `lib/interesses.ts` |
| 12 | Meus Ingressos — direção visual | ✅ código | `/meus-ingressos`, `components/Ingresso.tsx` |
| 12.1 | Definir o ativo visual principal | ✅ **decidido e justificado** | `components/Ingresso.tsx` |

### Parte III — Rodapé

| # | Pedido | Estado | Onde |
|---|---|---|---|
| 13.1 | Canais de contato | ⚠️ estrutura pronta, **faltam os dados** | `lib/contato.ts` |
| 13.2 | Perfis dos fundadores | ⚠️ estrutura pronta, **falta autorização** | `lib/contato.ts` |
| 13.3 | Links institucionais | ⚠️ parcial — 2 dos 5 não têm página | `components/Footer.tsx` |

---

## As decisões que valem discussão

### 1. O "verde sálvia" não existia — teve que ser criado

O item 6 pede "aumentar o uso do verde sálvia da paleta MUNAY". Só que o único
verde em `lib/brand.ts` era o `lime` (`#C6FF3D`), que é verde **ácido**. Não dá
pra aumentar o uso de uma cor que não está no arquivo.

Entrou `brand.salvia = "#7F9A72"`, e a divisão de trabalho ficou explícita: o
sálvia é o acento que PODE cobrir área (fundo de card, faixa, chip); o lime
continua sendo raro (regra 7 do projeto), reservado a um destaque por dobra e
ao foco. Ou seja: a regra 7 não foi enfraquecida — ganhou um companheiro que
faz o trabalho que ela proibia o lime de fazer.

**O `coral` NÃO foi mexido.** O briefing descreve a paleta como "coral
queimado", e o `#FF6B4A` atual é mais brilhante que queimado. Escurecer é uma
linha em `brand.ts` + `npm run tema` — mas trocar cor aprovada sem o PO pedir
seria inventar escopo. **Fica como pergunta pro Mateus.**

### 2. As cores de categoria são derivadas, não escolhidas

Seis acentos, todos calculados por mistura das cores da marca
(`tailwind.config.ts` → `ACENTOS_BASE`). Nenhum hex novo — a regra 4 continua
valendo com a paleta ampliada.

O de-para modalidade → acento mora em `lib/modalidades.ts` e é
**determinístico**: jiu-jítsu tem a mesma cor na home, na busca e no ingresso,
e continua tendo depois de filtrar. Cor por posição no grid mudaria a cada
filtro — e "reconhecimento visual rápido" é justamente o que isso destrói.

Duas armadilhas resolvidas no caminho, ambas registradas em comentário:
- **`safelist` no Tailwind.** A classe é escolhida em runtime, então o scanner
  não a vê no código. Sem safelist, o card sai colorido em dev e **cinza em
  produção**. Tem teste (`tests/landing.spec.ts`) que reprova se sumir.
- **Contraste medido, não estimado.** A primeira versão do tom `ink` reprovava
  no WCAG AA (3,98:1) num dos seis. Ajustado pra 4,91:1 no pior caso. E o tom
  `soft` subiu de 0.17 pra 0.28 depois de olhar a home renderizada: em 0.17 os
  seis cards ficavam quase iguais lado a lado, ou seja, a reclamação do PO
  continuava de pé.

### 3. Item 12.1 — o ativo visual dos ingressos: **o canhoto destacável**

O critério que o PO deu não é estético, é emocional: "transmitir mais liberdade
e mais sensação de paz no momento da compra (…) reduzir a ansiedade da
transação".

Escolhido o **ingresso de papel picotado**, contra as duas alternativas óbvias:

- **QR gigante** — é o que a indústria usa, e é o que mais aumenta ansiedade:
  ilegível pra humano. A pessoa não consegue conferir nada, só confiar. É o
  oposto do critério. (E não existe leitor de QR na porta de evento nenhum da
  MUNAY — seria ativo visual de um fluxo que não existe.)
- **Foto do evento** — bonita, mas empurra data/hora/local pra baixo da dobra,
  e é justamente ver esses três de relance que acalma.
- **O picote** — objeto que todo mundo já segurou. Comunica sem palavra: *está
  pago, é seu, é destacável* (= transferível = liberdade, o outro termo do
  critério). E se lê inteiro de uma vez, que é a metáfora da transparência.

Desenhado em CSS puro (dois círculos na cor do fundo), sem imagem nem SVG.

### 4. Item 4.1 — B2B ou B2S: **os dois** (decidido pelo Kaxcav em 07/08)

A primeira versão deste componente tinha copy propositalmente neutra, escrita
"pra caber nas duas" enquanto a decisão não vinha. **Foi jogada fora**, e a
diferença é sutil o bastante pra valer o registro:

Copy que serve dois públicos ao mesmo tempo não fala com nenhum. "Quem produz
e vende experiência" é verdadeiro pro professor de yoga e pro gerente de
marketing de uma rede — e inútil pros dois: um acha corporativo demais, o
outro acha pequeno demais. Cada um vai embora achando que o site é do outro.

"Os dois" resolvido direito não é uma mensagem que cabe em ambos — são **duas
mensagens lado a lado**, cada uma dizendo o nome de quem ela quer:

- **Trilha 01 · quem produz** (B2S) — run club, estúdio, professor autônomo,
  produtor de evento. Publique / Encha / Receba / Entenda.
- **Trilha 02 · quem apoia** (B2B) — marca, rede de academias, empresa com
  programa de bem-estar, órgão público. Ative / Escolha o recorte / Patrocine
  / Cuide do seu time.

**A hierarquia entre elas não é gosto, é funil.** A trilha de produção leva o
botão sólido em lime e vem primeiro: é ela que coloca oferta no ar antes de
03/09, com ciclo de decisão de dias. A institucional negocia em trimestres e
precisa de base pra negociar — B2B sem oferta é conversa sobre catálogo vazio.
Tem teste que reprova se as duas ganharem CTA de mesmo peso.

**Os dois botões apontam pro mesmo formulário**, de propósito: criar um
terceiro valor no enum `Lead.tipo` custaria migração + mudança no `/admin` +
no CSV, pra separar dois públicos que hoje somam zero cadastros. O campo
`organizacao`, que já existe, distingue na prática. Vira enum próprio quando o
volume justificar.

### 5. Item 8.1 — "sexo e gênero" virou só gênero

O briefing lista os dois em campos separados. Só `genero` foi implementado
(autodeclarado, texto livre com sugestões).

Motivo: sexo biológico não tem uso nenhum no produto — não filtra evento, não
recomenda comunidade, não emite nada. Dado sensível sem finalidade declarada é
passivo de LGPD, não ativo: aumenta a superfície de vazamento e a obrigação de
justificar, sem contrapartida. Se aparecer uma finalidade concreta, entra —
com a finalidade escrita na tela.

### 6. Item 9 — a aba "Pagos" vai nascer vazia, e está certo

O briefing dá peso estratégico a ela ("permite identificar o segmento que
realmente sustenta a receita") e o raciocínio procede. Mas **não existe
pagamento no MUNAY**: sem gateway, sem cobrança, sem transação. Todo evento é
`gratuito: true`.

A aba existe, classifica pelo único sinal real (`Event.gratuito === false`) e o
estado vazio diz com todas as letras que ingresso pago ainda não existe.
Esconder seria ignorar um pedido em silêncio; fingir que classifica pagamento
seria pior — alguém tomaria decisão de negócio em cima de número que não veio
de dinheiro nenhum.

Quando o pagamento existir, é a função `ehPago()` em `lib/inscricoes.ts` que
muda. Mais nada.

---

## ⛔ LGPD — o item 10.1 não foi implementado

O próprio briefing traz o PONTO DE ATENÇÃO: *"A coleta de CPF, localização e
histórico de consumo, somada ao compartilhamento de inteligência de público com
terceiros, exige base legal explícita, consentimento granular e política de
privacidade clara. Este ponto precisa ser validado **antes** da implementação:
é um risco jurídico e reputacional, não apenas técnico."*

O briefing manda validar antes. Foi seguido.

**O que ENTROU:**

- **Consentimento granular de verdade** — três finalidades separadas (cadastro,
  recomendação, estatística agregada), cada uma com seu opt-in, gravadas como
  **data** e não booleano. "Desde quando consentiu" é o que se prova numa
  fiscalização; booleano não prova nada. Junto vai a versão da política aceita
  (`politicaVersao`), senão publicar uma política nova apagaria a prova do
  consentimento anterior.
- **Minimização** — CPF é opcional, com a finalidade escrita ao lado do campo.
  CEP sim, endereço não. Sem "sexo".
- **Direito de eliminação (art. 18)** — botão que apaga a camada de perfil sem
  apagar a conta nem as inscrições (essas têm outra base legal: o organizador
  precisa da lista de quem confirmou presença).
- **Idade mínima de 16** — o art. 14 põe dado de criança (até 12) em regime
  especial com consentimento parental. Não existe fluxo parental no MUNAY e
  construir um é projeto próprio. O corte é pro CADASTRO DE PERFIL; **RSVP
  continua sem exigir conta, pra qualquer idade**.
- **Perfil privado por padrão** — bio e interesses só aparecem com opt-in
  explícito. CPF, nascimento, telefone e CEP **nunca** aparecem, nem com o
  perfil público ligado.
- **`panoramaAgregado()` com k-anonimato (k=5)** — números agregados pro
  `/admin` interno. Conta PESSOAS distintas, não inscrições (senão um usuário
  ativo sozinho fura o corte), e recorte abaixo de 5 é **descartado**, não
  arredondado.

**O que NÃO entrou, e por quê:**

O produto de dados vendável pra terceiros (item 10.1, segunda oportunidade).
Compartilhar perfil de público com terceiro sem base legal é infração com
multa de até 2% do faturamento — e, num candidato a edital público, o risco
reputacional é maior que o financeiro.

**O que falta pra isso virar viável, e não é código:**

1. Parecer jurídico sobre a base legal do compartilhamento (consentimento
   específico? legítimo interesse com LIA documentada?).
2. Política de privacidade reescrita descrevendo a finalidade — a atual não
   menciona compartilhamento com terceiros.
3. Definição de quem é operador e quem é controlador na relação com o
   organizador que compra o dado.
4. Contrato-modelo com cláusula de tratamento.

Só depois disso o código é a parte fácil: `lib/inteligencia.ts` já tem a
agregação com k-anonimato pronta pra virar o que for aprovado.

---

## Pendências que dependem de DADO, não de código

### 1. Fotos e vídeos da seção de mídia (item 2)

`public/` está vazia. A seção funciona hoje com composições gráficas abstratas
(SVG procedural, no idioma do `PlanoPiloto`) que **não fingem ser foto** — e um
aviso visível de que são ilustrativas, que some sozinho quando houver mídia
real.

**Pra preencher:** arquivo em `public/midia/`, `src` preenchido em
`lib/midia.ts`. Zero mudança de componente.

⚠️ Só entra mídia com autorização de imagem assinada por quem aparece **e** pela
comunidade (regra 3 + direito de imagem). Prova social falsa é pior que
nenhuma, e o site é evidência de edital.

### 2. Telefone, WhatsApp e Instagram (item 13.1)

Não existem em lugar nenhum do projeto. `lib/contato.ts` os declara vazios e o
rodapé **não renderiza canal sem valor** — nada de `(61) 9xxxx-xxxx`.

Foi exatamente um placeholder desses que produziu o `contato@munay.app.br`, que
ficou semanas no ar inclusive na política de privacidade. Tem teste que reprova
se um placeholder voltar.

⚠️ `@munay` no Instagram pertence a outra pessoa — publicar mandaria nosso
tráfego pro perfil de um terceiro. Confirmar o handle real antes.

### 3. Perfis dos fundadores (item 13.2)

Mesma estrutura, motivo mais forte: **expor perfil pessoal de alguém é decisão
da pessoa**. O briefing diz "perfis pessoais", ou seja, conta pessoal mesmo.
Publicar o Instagram do Mateus ou do Kaxcav sem os dois confirmarem seria
decidir pela exposição de terceiro.

**Pra preencher:** nome como querem ser chamados, uma linha de papel, e o OK
explícito de cada um sobre qual perfil vai ao ar.

### 4. Dois links institucionais não têm página (item 13.3)

O briefing lista cinco. Três existem (`/comunidades`, `/mapa`, `/privacidade`).
Faltam:

- **"Eventos"** — não existe índice, e isso é **decisão de arquitetura**
  registrada no `CLAUDE.md` ("evento se descobre pela comunidade"), não
  esquecimento. Criar um índice contradiria a decisão; o PO precisa dizer se
  quer revertê-la.
- **"Experiências esportivas e culturais"** — seria o índice `/descobrir`, que
  está em `docs/IDEIAS.md` e não foi começado.

Nenhum dos dois virou link. Link institucional pra 404 é erro multiplicado por
página (o rodapé está em todas), no domínio que é a evidência da Etapa 2.

### 5. Os dois termos ilegíveis da transcrição

O briefing registra: *"Dois itens ditados no áudio não ficaram claros: uma
expressão registrada como 'de irrisada água' e um termo registrado como
'Glacimune'. Não foram interpretados para evitar erro de marca."*

Continuam sem interpretação — chutar nome de marca é como se erra feio. **O
Mateus precisa confirmar os dois.** (Palpite não usado em lugar nenhum: "de
irrisada água" pode ser "Água Mineral", apelido do Parque Nacional de Brasília.
"Glacimune" não tem palpite.)

---

## Arquivos

**Novos**

```
lib/cor.ts                       matemática de cor sem imports (ver nota abaixo)
lib/modalidades.ts               modalidade → acento de categoria
lib/midia.ts                     catálogo do feed de mídia
lib/interesses.ts                catálogo de tags
lib/perfil.ts                    validação (CPF, CEP, idade) — client+server
lib/perfil-perguntas.ts          camada de personalidade
lib/inscricoes.ts                classificação Ativos/Encerrados/Pagos
lib/inteligencia.ts              inferência de consumo + agregado k-anônimo
components/Mosaico.tsx           seção de mídia
components/MidiaPlaceholder.tsx  composições gráficas
components/PainelFuncional.tsx   os três blocos + Cursos
components/Ingresso.tsx          o ingresso picotado
components/perfil/{Campo,PainelAjuda,SeletorInteresses,PerfilForm}.tsx
app/perfil/{page.tsx,actions.ts}
app/meus-ingressos/page.tsx
prisma/migrations/20260807120000_perfil_interesses_consentimento/
tests/{perfil,inscricoes,landing}.spec.ts
```

**Modificados:** `lib/brand.ts` · `lib/tema.ts` · `lib/contato.ts` ·
`tailwind.config.ts` · `app/globals.css` · `app/page.tsx` ·
`app/minhas-inscricoes/page.tsx` · `prisma/schema.prisma` ·
`components/{Hero,ComoFunciona,Publicos,Vitrine,Footer,Header}.tsx`

### Nota técnica que vai economizar meia hora de alguém

`lib/cor.ts` nasceu de um erro que aponta pro arquivo errado. O
`tailwind.config.ts` passou a precisar de `misturar()`, que morava em
`lib/tema.ts`. Importar de lá quebra o build com `MODULE_NOT_FOUND` acusando o
`tema.ts` — porque o `tailwind.config.ts` **não é compilado pelo webpack do
Next**, e o loader de config do Tailwind não lê os `paths` do tsconfig. O
`@/lib/brand` dentro do `tema.ts` é resolvível pelo app inteiro e irresolvível
ali.

`lib/cor.ts` não importa nada e nunca vai importar. É o que permite o mesmo
código servir ao app (alias), ao Tailwind (relativo) e às OG images.

---

## Verificação feita

- `npx tsc --noEmit` — limpo.
- `npm run lint` — limpo.
- `npm run build` — passa. `/perfil` = 18,9 kB de JS de cliente; o bundle
  compartilhado do site público **não mudou** (102 kB).
- **Migração aplicada de verdade** num Postgres 16 limpo, as 6 na ordem,
  `psql -v ON_ERROR_STOP=1`. Colunas conferidas com `\d users`.
- `npx playwright test` — **128 passando** (77 que já existiam + 51 novos).
- Telas renderizadas e conferidas visualmente com sessão forjada no container:
  home, `/perfil`, `/meus-ingressos`, `/minhas-inscricoes`. **Três defeitos só
  apareceram aí** e foram corrigidos: o campo de gênero livre sumia ao apagar o
  último caractere; a mensagem de erro da data prometia "dia/mês/ano" que o
  seletor nativo não usa; e os cards ainda estavam lavados demais.

**Não verificado:** o fluxo de salvar o perfil com sessão real (o container não
levanta o magic link). A action foi lida linha a linha, mas **o primeiro
`POST` de verdade vai acontecer na máquina do Kaxcav**.

---

## Para o Kaxcav

1. `git checkout -b feat/briefing-mateus`, revisar o diff, commitar.
2. **A migração precisa rodar em produção.** O Railway já tem
   `npx prisma migrate deploy` no Pre-deploy Command, então o push cuida —
   mas vale conferir o log do deploy, porque é a primeira migração desde o
   incidente de 06/08.
3. Testar salvar o perfil logado, uma vez, com sessão real.
4. Se quiser o `coral` queimado de verdade: uma linha em `lib/brand.ts` +
   `npm run tema`.

## Para o Mateus

Quatro perguntas, em ordem de quanto destravam:

1. **Telefone, WhatsApp e Instagram** — quais são? O rodapé está pronto e
   vazio.
2. **Os perfis pessoais de vocês dois** vão ao ar? Quais?
3. **"De irrisada água" e "Glacimune"** — o que eram?
4. **Existem fotos e vídeos com autorização de uso?** A seção de mídia está
   pronta esperando arquivo.

(O item 4.1 — B2B ou B2S — **já foi decidido pelo Kaxcav: os dois**, com as
duas trilhas no ar. Se você discordar da hierarquia entre elas, é onde mexer.)

E um aviso: o item 10.1 (vender inteligência de público) **não foi construído**
e não deve ser prometido a ninguém antes do parecer jurídico. É o único ponto
do briefing onde o risco não é de produto, é de multa.
