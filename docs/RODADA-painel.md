# Rodada do painel — como dividir entre janelas

**Data:** 07/08/2026 · **Base:** `feat/painel-organizador` (`8976d07`)
**Pré-requisito de leitura:** `CLAUDE.md` (seções "Trabalhar em paralelo" e
"Armadilhas") e `docs/stories/STORY-009-painel-organizador.md`.

O que já está de pé: os modelos, o `lib/organizacao.ts` com o filtro de dono,
e o portão de aprovação fechado nas seis consultas públicas. 94 testes verdes.
O que falta é tela — e tela é o que mais rende em paralelo, desde que as
janelas não escrevam nos mesmos arquivos.

## A regra que faz paralelo funcionar

Paralelize por **pasta**, não por intenção. Duas pessoas "trabalhando em
coisas diferentes" no mesmo arquivo é uma pessoa trabalhando e outra
resolvendo conflito. A divisão abaixo foi desenhada pra que os conjuntos de
arquivos sejam disjuntos.

Três arquivos são gargalo e **todo mundo precisa** deles: `lib/organizacao.ts`,
`tests/fixtures.ts` e `prisma/schema.prisma`. A regra pra eles é: quem precisa
de função nova **cria em arquivo próprio** (`lib/cadastro.ts`,
`lib/convites.ts`) em vez de engordar o `organizacao.ts`. Se for inevitável
mexer nos três, avise antes — não é proibido, é coordenado.

## Divisão em quatro frentes

| Frente | Entrega | Arquivos que ela possui | Depende de |
|---|---|---|---|
| **A · Cadastro** | Formulário de cadastro de comunidade com checkbox de autorização, nascendo `pendente`; cria a `Organization` e vincula quem cadastrou | `app/painel/nova/**`, `lib/cadastro.ts`, `tests/cadastro.spec.ts` | — |
| **B · Aprovação** | Fila no `/admin`: aprovar, recusar com motivo, ver o texto aceito; e-mail de recusa | `app/admin/aprovacoes/**`, `lib/aprovacao.ts`, `tests/fila-aprovacao.spec.ts` | — |
| **C · Painel** | `/painel` com as comunidades da organização, edição, CRUD de evento, inscritos, check-in, CSV por evento | `app/painel/(interno)/**`, `tests/painel.spec.ts` | A (pra ter o que listar) |
| **D · Convites** | Link aberto vira membro; convite nominal por e-mail vira organizador | `app/painel/[slug]/membros/**`, `app/convite/**`, `lib/convites.ts`, `tests/convites.spec.ts` | — |

**A e B podem começar ao mesmo tempo, agora.** C entra quando A existir. D é
independente das três e pode ir a qualquer momento.

## O que cada frente não pode esquecer

**A · Cadastro.** O checkbox grava `autorizacaoTexto` e `autorizacaoEm` — o
texto inteiro, não um booleano, porque a redação muda com o tempo e o que
vale juridicamente é a que a pessoa leu. A comunidade nasce `pendente` **na
aplicação**, nunca no default da coluna (o default é `aprovada` de propósito,
senão o deploy some com tudo que já está no ar). Quem cadastra vira
`OrganizationMember` na mesma transação — se falhar no meio, ninguém fica dono
de comunidade órfã.

**B · Aprovação.** Recusar é status, não delete. O e-mail de recusa sai
**depois do commit**, como todo e-mail do projeto, e leva o motivo. Aprovar
uma comunidade cujo nome é de parceiro real sem autorização é o cenário que a
regra 3 proíbe — a tela precisa **mostrar o texto de autorização aceito**, não
só um "ok".

**C · Painel.** Nenhuma página consulta Prisma direto: tudo por
`lib/organizacao.ts`. Recurso que não é da pessoa vira **404, nunca 403** —
403 confirma que existe. CSV é **por evento**; não crie rota de export global
no painel. Cancelar evento é status, avisa os inscritos e **não promove a
fila**.

**D · Convites.** A separação é a segurança inteira: link aberto concede
`Membership` (seguir), convite nominal com aceite concede
`OrganizationMember` (administrar). Se link aberto der poder, qualquer um com
o link vê nome, e-mail e WhatsApp de gente real. O convite expira e o aceite
compara o e-mail da sessão com o do convite.

## Antes de abrir PR, em qualquer frente

Rode a suíte **contra banco vazio**, não contra o seu banco de trabalho —
metade dos verdes falsos de 07/08 vieram de dado de seed que o CI não tem. E
se a frente entregou guarda de segurança, quebre a guarda de propósito e
confirme que o teste fica vermelho antes de confiar nele.

## Fora desta rodada

App mobile, API v1, checkout, `Friendship`, eixo de tempo no mapa e
recorrência. Todos têm motivo escrito no `CLAUDE.md` ou no parecer de 06/08 —
nenhum deles é "esqueceram".
