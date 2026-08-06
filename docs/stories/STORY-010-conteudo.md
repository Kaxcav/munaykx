# STORY-010 · Conteúdo (C5) — feed de avisos por comunidade

**Repo:** munay-site · **Executor:** Claude Code (@dev) · **Review/merge:** Kaxcav
**Branch:** `feat/conteudo-feed` a partir da `main`.
**Tipo: SPEC.** Escrita em 06/08/2026 (ONDA 1). **Execução é ONDA 2/3**, depois
do resultado do edital (15/10).

**Depende de:** STORY-007 (auth) · STORY-008 (quem segue recebe) ·
STORY-009 (quem publica é organizador).

---

## Contexto

O Blueprint C5 prevê três coisas: feed (`Post`), fórum
(`ForumThread`/`ForumReply`) e cursos (`Course`/`Lesson`). O §7, decisão 4,
pergunta qual é o recorte mínimo e **recomenda o feed de avisos por
comunidade**. Esta spec adota a recomendação e explica por que as outras duas
ficam fora — porque "ficou pra depois" sem motivo vira dívida esquecida.

⚠️ **Pendente de ratificação do PO** (decisão 4 do Blueprint §7).

O problema real que o feed resolve: hoje, quando um treino muda de local ou é
cancelado por chuva, o organizador avisa no grupo de WhatsApp — e quem não está
no grupo (justamente o iniciante que a MUNAY trouxe) aparece no lugar errado.
**Esse é o pior momento possível da jornada de quem estava começando.**

---

## Decisões de arquitetura

### 1. Só `Post`. Fórum e cursos ficam fora, e o motivo é operacional

**Fórum:** conteúdo gerado por usuário sem moderador é passivo, não ativo. Um
fórum vazio comunica abandono; um fórum com spam comunica pior. Exige gente
disponível pra moderar todo dia, e a MUNAY tem duas pessoas com outras
prioridades até novembro.

**Cursos:** exigem produção de conteúdo que ninguém tem tempo de fazer, e
`Course`/`Lesson` sem aula gravada é tabela vazia. Cursos também sugerem
monetização (C6), que o Blueprint coloca só depois da tração.

O feed é o oposto dos dois: quem publica já existe (o organizador), o conteúdo
é curto e situacional, e a moderação é mínima porque o publicador é
identificado e responsável.

### 2. Publicação é one-way. Não tem comentário.

Comentário é fórum com outro nome — mesma exigência de moderação, mesmo risco.
O aviso é do organizador pra quem segue, e a resposta acontece onde já
acontece: no WhatsApp da comunidade, no treino.

Se a demanda por conversa aparecer com dado (gente pedindo), aí vira story
própria, com moderação desenhada. Não antes.

### 3. Quem publica é organizador da comunidade, e só

Reusa `lib/organizacao.ts` da STORY-009. Nenhuma permissão nova, nenhum papel
novo. Se você pode editar a comunidade, você pode avisar por ela.

### 4. Aviso por e-mail é **opt-in separado** do aviso de evento

A STORY-008 liga o aviso de **evento novo** por padrão, porque é o motivo de
seguir. Aviso de **post** é diferente: é mais frequente, mais miúdo, e ninguém
pediu. Então nasce **desligado**, e a pessoa liga se quiser.

Regra prática: e-mail que a pessoa espera vem ligado; e-mail que ela não
espera vem desligado. Inverter isso é como se perde domínio pra reputação de
spam — e a gente acabou de aquecer o `sejamunay.com.br`.

**Teto rígido: no máximo 1 e-mail de post por comunidade por pessoa por dia.**

### 5. Post tem prazo de validade visual, não de dado

Aviso de "hoje o treino é no campo 2" é lixo daqui a três dias. O post não é
apagado (histórico importa pro organizador), mas o feed público mostra os
últimos 30 dias e a agenda mostra só os últimos 7.

### 6. Admin pode ocultar qualquer post, sempre

`ocultoEm` + motivo. Não é censura editorial: é o botão que precisa existir
quando alguém publicar algo ilegal, ofensivo ou dado pessoal de terceiro às
3h da manhã de um sábado. Ocultar é reversível; apagar não.

### 7. Post NÃO é indexável pelo Google nesta story

Conteúdo curto, situacional e efêmero indexado em massa é exatamente o padrão
que derruba domínio — mesma lógica das doorway pages de `lib/descoberta.ts`.
Os posts aparecem na página da comunidade com `noindex` na listagem paginada.
Quando houver post que valha SEO (guia, roteiro), vira tipo próprio e story
própria.

---

## Migration

```prisma
model Post {
  id          String    @id @default(uuid())
  createdAt   DateTime  @default(now()) @map("created_at")
  communityId String    @map("community_id")
  autorId     String    @map("autor_id")
  corpo       String    @db.Text
  // Moderação — ver decisão 6. Ocultar é reversível; apagar não existe.
  ocultoEm    DateTime? @map("oculto_em")
  ocultoMotivo String?  @map("oculto_motivo")

  community Community @relation(fields: [communityId], references: [id], onDelete: Cascade)
  autor     User      @relation(fields: [autorId], references: [id])

  @@index([communityId, createdAt])
  @@map("posts")
}

// Em Membership (STORY-008):
//   avisarPosts Boolean @default(false) @map("avisar_posts")   // opt-in — decisão 4
```

`autor` sem `onDelete: Cascade` de propósito: apagar a conta do organizador não
pode sumir com o histórico de avisos que a comunidade recebeu. O nome deixa de
aparecer; o aviso fica.

> ⚠️ Isso conflita com "apagar conta apaga tudo" da LGPD. A resolução é
> **anonimizar, não deletar**: o post permanece, o autor vira "organizador da
> comunidade". Decidir isso na execução com o texto da política de privacidade
> na mão, não no improviso.

---

## Tarefas

1. **Migration + modelo**, com a coluna `avisarPosts` em `Membership`. Conferir
   `DATABASE_URL` antes de rodar (near-miss de 06/08).

2. **`lib/posts.ts`** — fonte única. Criar, listar por comunidade (respeitando
   `ocultoEm`), listar pro feed de quem segue. Validação Zod compartilhada:
   corpo entre 3 e 1000 caracteres, sem HTML.

3. **Sanitização de entrada.** O corpo é texto puro. Nada de HTML, nada de
   markdown renderizado nesta versão — só quebra de linha e link
   autodetectado com `rel="nofollow ugc"`. Campo de texto livre publicado é
   superfície de XSS; a defesa é não aceitar marcação, não filtrar marcação.

4. **Publicar** — no painel do organizador (STORY-009), dentro da comunidade.

5. **Exibir** na página da comunidade: últimos 30 dias, paginado, `noindex` na
   listagem.

6. **Na agenda** (STORY-008): avisos dos últimos 7 dias das comunidades
   seguidas, junto dos eventos. É onde a pessoa realmente vai ver.

7. **E-mail opt-in** com o teto diário, pós-commit, reusando `lib/email.ts` e o
   descadastro de um clique da STORY-008.

8. **Ocultar no `/admin`** — com motivo obrigatório e registro de quem ocultou.

9. **Privacidade e termos** — o post é público; quem publica é responsável.
   Definir a regra de anonimização do autor (ver aviso na migration).

10. **Testes:** post oculto não aparece em lugar nenhum (nem na agenda, nem no
    RSS se existir); HTML no corpo sai escapado; teto de e-mail respeitado;
    quem não segue não recebe; post de comunidade `pendente` não vaza.

---

## Critérios de pronto

- Organizador publica; quem segue vê na agenda e na página da comunidade
- **HTML no corpo aparece escapado** — verificado com `<script>` de verdade
- Post oculto some de toda superfície, incluindo a agenda de quem já tinha visto
- E-mail de post só chega pra quem ligou; 5 posts seguidos geram 1 e-mail
- Listagem de posts sai com `noindex`; não entra no sitemap
- Comunidade `pendente` (STORY-009) não publica nada visível
- `npm run build`, `typecheck` e `lint` limpos

---

## Fora de escopo

Fórum e respostas (decisão 1), comentários (decisão 2), cursos e aulas
(decisão 1), imagem ou vídeo no post (exige storage e moderação de mídia —
story própria), markdown ou editor rico, agendamento de publicação, post
fixado, reações/curtidas, notificação in-app (C7), RSS, e post da MUNAY
institucional (o feed é da comunidade, não da plataforma).

---

## Handoff final

Feito / assumido / desvios / travou. Obrigatório relatar: o que exatamente
acontece com posts de um organizador que apaga a conta (a decisão de
anonimização), e o resultado do teste de XSS com payload real.
