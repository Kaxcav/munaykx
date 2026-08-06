# STORY-008 · Pertencimento (C3) — seguir comunidade, minhas comunidades, agenda

**Repo:** munay-site · **Executor:** Claude Code (@dev) · **Review/merge:** Kaxcav
**Branch:** `feat/pertencimento` a partir da `main`.
**Tipo: SPEC.** Escrita em 06/08/2026 (ONDA 1). **Execução é ONDA 2**, depois do
resultado do edital (15/10) — construir antes queima orçamento não reembolsável.

**Depende de:** STORY-007 (auth) — em produção. Sem e-mail provado, seguir uma
comunidade não tem dono.

---

## Contexto

A plataforma hoje é anônima dos dois lados. A pessoa descobre uma comunidade,
se inscreve num evento e some — não existe relação que sobreviva ao evento. O
Blueprint chama isso de camada **C3 · Pertencimento** e é o que transforma
descoberta em retorno: sem ela, cada visita começa do zero e a MUNAY é um
buscador, não uma plataforma.

O ganho concreto e mensurável é a **agenda**: quem segue comunidades tem uma
página que responde "o que eu tenho essa semana". Isso é o que faz a pessoa
voltar sem campanha.

**Premissa herdada da 007, que continua inegociável: RSVP funciona SEM conta.**
Pertencimento é aditivo. Nenhuma tela desta story pode virar barreira pra
inscrição.

---

## Decisões de arquitetura (o Blueprint C3 deixou em aberto)

### 1. `Favorite` NÃO existe. Fica só `Membership`.

O Blueprint lista `Membership` e `Favorite` como coisas separadas. Na prática
viram dois botões que o usuário não consegue diferenciar — "seguir" e
"favoritar" a mesma comunidade, na mesma tela. Todo produto comparável tem
**um** verbo: Meetup tem "join group", Strava tem "join club", Instagram tem
"follow".

Fica **um** relacionamento, com um verbo: **Seguir**.

O que separaria os dois de verdade seria **aprovação** — "membro" sugere que o
organizador te aceitou, "seguidor" é unilateral. Esta spec decide que seguir é
**auto-serviço, sem aprovação** (ver decisão 2), o que apaga a distinção e
torna `Favorite` redundante.

> Se um dia fizer falta separar (ex.: comunidade fechada com lista de membros
> aprovada), o caminho é adicionar `status` em `Membership`, não criar tabela
> nova. Modelagem já preparada pra isso.

### 2. Seguir é auto-serviço, sem aprovação do organizador

Aprovação transfere trabalho pro organizador e trava crescimento na fila de
alguém que não abre o painel há duas semanas. Comunidade esportiva de bairro é
aberta por natureza — o valor está em aparecer, não em filtrar.

Consequência aceita: qualquer pessoa segue qualquer comunidade. Isso é o
comportamento certo, não uma brecha.

### 3. Papel `organizador` NÃO se auto-atribui nesta story

`Membership.papel` aceita `membro` e `organizador`, mas nesta story **só o
`/admin` promove alguém a organizador**. Auto-reivindicação de comunidade é
sequestro esperando acontecer e é problema da STORY-009, que tem o fluxo de
aprovação pra isso.

O campo já nasce aqui pra 009 não precisar de migration de alteração.

### 4. Reviews ficam FORA — recomendação do Blueprint §7, decisão 3

O Blueprint pergunta se avaliações entram na primeira leva pós-auth e
**recomenda que não**, por custo de moderação. Esta spec adota a recomendação,
com dois motivos adicionais que valem registrar:

- **Volume baixo torna review pior que ausência de review.** Uma comunidade com
  1 avaliação de 2 estrelas fica marcada pra sempre, sem amostra que corrija.
- **Review é conteúdo de terceiro sobre negócio real** — abre responsabilidade
  que a MUNAY não tem estrutura pra responder antes da tração.

⚠️ **Pendente de ratificação do PO** (decisão 3 do Blueprint §7).

### 5. Aviso de evento novo por e-mail: opt-out, nunca opt-in silencioso

Seguir uma comunidade cria expectativa de ser avisado — é o motivo de seguir.
Então o aviso vem **ligado por padrão**, com descadastro em um clique em todo
e-mail. Isso é exigência de LGPD, não cortesia.

**Um e-mail por evento novo, no máximo um por comunidade por dia.** Sem esse
teto, um organizador que cadastra a temporada inteira numa tarde dispara vinte
e-mails por seguidor e queima o domínio que a gente acabou de aquecer.

### 6. Agenda é derivada, não é tabela

A agenda de alguém = eventos futuros das comunidades que segue ∪ eventos com
RSVP ativo dessa pessoa. Query, não materialização. Materializar agenda é a
otimização errada em qualquer volume que a MUNAY vá ver antes de 2027.

---

## Migration

```prisma
enum PapelMembership {
  membro
  organizador
}

model Membership {
  id          String          @id @default(uuid())
  createdAt   DateTime        @default(now()) @map("created_at")
  userId      String          @map("user_id")
  communityId String          @map("community_id")
  papel       PapelMembership @default(membro)
  // Opt-out do aviso de evento novo. Default true — ver decisão 5.
  avisarEventos Boolean       @default(true) @map("avisar_eventos")

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  community Community @relation(fields: [communityId], references: [id], onDelete: Cascade)

  @@unique([userId, communityId])
  @@index([communityId])
  @@map("memberships")
}
```

`onDelete: Cascade` nos dois lados: apagar conta apaga o vínculo (LGPD,
princípio 4 do Blueprint), apagar comunidade não deixa órfão.

`@@unique([userId, communityId])` faz o "seguir" ser idempotente no banco —
clique duplo não cria linha dupla.

---

## Tarefas

1. **Migration + modelo.** `Membership`, enum, relações em `User` e
   `Community`. Rodar `migrate dev` **apontando pro banco local** — a
   `DATABASE_URL` do PowerShell já apontou pra produção uma vez (06/08,
   near-miss registrado); conferir antes de rodar.

2. **`lib/membership.ts`** — fonte única. `seguir(userId, communityId)`,
   `deixarDeSeguir(...)`, `segue(...)`, `comunidadesDe(userId)`. `seguir` usa
   `upsert`, não `create`, pra ser idempotente também na aplicação.

3. **Botão Seguir** em `/comunidades/[slug]`. Sem sessão, o botão não some: ele
   leva pro `/entrar?next=...` com a intenção preservada, e completa o seguir
   depois do login. Botão que some ensina que a funcionalidade não existe.

4. **`/minhas-comunidades`** — lista das comunidades seguidas, com próximo
   evento de cada uma e o toggle de aviso por e-mail por comunidade.

5. **`/agenda`** — a página que justifica a story. Linha do tempo dos próximos
   eventos das comunidades seguidas + os RSVPs ativos da pessoa, ordenada por
   data, marcando quais já têm inscrição confirmada e quais não. Vazia, ela
   convida a seguir comunidades — nunca mostra tela em branco.

6. **Aviso de evento novo.** Ao criar evento (admin ou painel), enfileirar
   e-mail pros seguidores com `avisarEventos = true`. Reusar `lib/email.ts` e o
   padrão de `lib/emails-rsvp.ts`: **disparo sempre pós-commit, nunca dentro da
   transação**. Aplicar o teto de 1 e-mail por comunidade por dia por pessoa.

7. **Descadastro em um clique.** Link assinado no rodapé do e-mail que desliga
   o aviso daquela comunidade sem exigir login. Token de uso único, mesma
   família do token de RSVP. Sem isso a story não pode ir pra produção.

8. **Reivindicação de vínculo, igual à 007.** Quem já fez RSVP em eventos de
   uma comunidade e depois cria conta recebe sugestão de seguir — **sugestão,
   nunca vínculo automático.** Seguir alguém sem pedir é o tipo de coisa que
   destrói confiança de graça.

9. **Privacidade.** Atualizar `/privacidade`: o que é guardado (que comunidades
   você segue), pra quê (montar sua agenda e te avisar), e como sair.

10. **Testes** cobrindo: seguir é idempotente; deixar de seguir não apaga RSVP;
    agenda de quem não segue nada não quebra; teto de e-mail respeitado;
    descadastro funciona sem sessão; apagar conta apaga os vínculos.

---

## Critérios de pronto

- Seguir e deixar de seguir funcionam, e clicar duas vezes rápido não duplica
- Sem sessão, o botão Seguir leva ao login **e completa a ação depois**
- `/agenda` mostra evento de comunidade seguida mesmo sem RSVP, e RSVP de
  comunidade não seguida — os dois caminhos
- Evento novo dispara um e-mail por seguidor; **cadastrar 5 eventos seguidos
  dispara 1, não 5**
- Descadastro pelo link do e-mail funciona deslogado, e é irreversível sem novo
  consentimento
- **RSVP anônimo continua funcionando exatamente como antes** — nenhuma rota
  passou a exigir sessão
- Apagar usuário apaga memberships (verificado por teste, não por leitura)
- `npm run build`, `typecheck` e `lint` limpos

---

## Fora de escopo

Reviews e avaliações (decisão 4 — pendente do PO), painel self-service do
organizador (STORY-009), feed e conteúdo (STORY-010), notificação in-app
(C7 — só e-mail aqui), comunidade fechada com aprovação, convite de membro,
lista pública de seguidores (número agregado pode; nomes não, sem consentimento
explícito), badge/gamificação de qualquer tipo.

---

## Handoff final

Feito / assumido / desvios / travou. Obrigatório relatar: se o teto de e-mail
foi implementado por consulta ou por coluna de controle, e o que acontece
quando dois eventos são criados simultaneamente na mesma comunidade (o teto
tem que segurar mesmo em corrida).
