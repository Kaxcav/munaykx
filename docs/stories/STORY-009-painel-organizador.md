# STORY-009 · Painel do organizador (C4) — self-service, inscritos e check-in

**Repo:** munay-site · **Executor:** Claude Code (@dev) · **Review/merge:** Kaxcav
**Branch:** `feat/painel-organizador` a partir da `main`.
**Tipo: SPEC.** Escrita em 06/08/2026 (ONDA 1). **Execução é ONDA 2**, depois do
resultado do edital (15/10).

**Depende de:** STORY-007 (auth). **Convive com** STORY-008 — usa
`Membership.papel = organizador`, mas não exige que a 008 esteja pronta.

---

## Contexto

Hoje cadastrar parceiro é trabalho do Kaxcav no `/admin`. Isso não escala e,
pior, coloca a MUNAY como gargalo de um dado que só o organizador conhece:
horário que mudou, evento cancelado, vaga extra. Enquanto o cadastro depender
de nós, o conteúdo envelhece.

Esta é também a camada que transforma a MUNAY de diretório em ferramenta: o
organizador ganha lista de inscritos e check-in, coisas que ele hoje resolve em
planilha ou grupo de WhatsApp. **É o primeiro momento em que a plataforma
trabalha PARA o parceiro em vez de só falar sobre ele** — e é o que sustenta a
conversa de parceria sem dinheiro na mesa.

---

## Decisões de arquitetura (o Blueprint C4 deixou em aberto)

### 1. A pergunta central é de segurança: como alguém vira organizador?

Auto-reivindicação livre de comunidade existente é sequestro. Qualquer pessoa
clicaria "esta comunidade é minha" na Liga Entrequadras e passaria a ver a
lista de inscritos — nome, e-mail e WhatsApp de gente real.

**Dois caminhos, com regras diferentes de propósito:**

| Caminho | Regra |
|---|---|
| **Criar comunidade nova** | Livre pra qualquer conta. Nasce `pendente`, invisível no site. Admin aprova → vai ao ar. Quem criou é organizador dela desde o primeiro segundo. |
| **Reivindicar comunidade existente** | **Sempre** passa por aprovação do admin. Nunca automático, nem com e-mail do mesmo domínio. |

Comunidade nova é barata de aprovar (é conteúdo novo) e cara de errar só em
spam. Comunidade existente é o oposto: aprovar errado vaza dado pessoal de
terceiros. Por isso a assimetria.

### 2. `pendente` resolve a regra 3 do projeto sem virar burocracia

A regra 3 proíbe publicar parceiro real sem autorização escrita. O formulário
de cadastro com **checkbox de autorização explícita** ("sou responsável por
esta comunidade e autorizo a publicação") É a autorização — assinada por quem
tem legitimidade pra dar.

O `pendente` + aprovação existe pra filtrar spam e má-fé, não pra duvidar do
organizador. Guardar o texto e o timestamp do aceite: é a prova documental.

### 3. `Organization` existe, mas fica fina

O Blueprint prevê `Organization` como "o negócio do parceiro". Nesta story ela
serve pra **uma coisa**: agrupar comunidades sob um dono, pra quando o mesmo
CNPJ tiver várias. Nada de CNPJ obrigatório, endereço, logo ou plano — isso é
C6 e não tem cliente pedindo.

Uma conta pode ter várias organizações; uma organização pode ter vários
membros com papel de organizador. Modelado assim desde já porque separar
depois exige migração de dado vivo.

### 4. Escopo de dado é a regra que não pode falhar

**Todo** query do painel é filtrada pela organização da sessão. Não existe
"filtra na view": o filtro mora na camada de dados, e a camada de UI nunca
recebe registro que não seja do dono.

O risco concreto: um `findMany` sem `where` de organização numa listagem de
RSVPs entrega a base inteira de participantes. Isso é incidente de LGPD, não
bug de listagem. **Teste obrigatório: organizador A pede o evento de B por ID
direto na URL e recebe 404, não 403** — 403 confirma que o recurso existe.

### 5. Organizador vê contato, mas não vê base

O organizador precisa de nome e e-mail dos inscritos **dos próprios eventos**
pra operar (avisar mudança de local, confirmar presença). Isso é finalidade
legítima e vai declarada na política de privacidade.

O que ele **nunca** vê: leads que não se inscreveram nos eventos dele,
participantes de outras comunidades, e qualquer agregado da base da MUNAY.
Export de CSV é permitido **por evento**, nunca global.

### 6. Check-in é lista com toque, não QR code

QR exige app, câmera e sinal — e treino acontece em quadra e parque, onde não
tem nenhum dos três de forma confiável. O check-in é a lista de confirmados
numa tela de celular, com busca por nome e um toque pra marcar presente.

**Otimista na UI, tolerante a rede ruim:** marca na hora, sincroniza depois,
e mostra claramente o que ainda não subiu. Marcar presença duas vezes é o
mesmo que marcar uma (idempotente por `rsvpId`).

O QR fica registrado como ideia pra quando existir app (ONDA 4).

### 7. Cancelar evento não apaga evento

Organizador cancela → evento vira `cancelado`, some da descoberta, e **todos os
inscritos recebem e-mail**. Ninguém apaga linha com gente inscrita. A promoção
de fila da STORY-003 não roda em evento cancelado.

---

## Migration

```prisma
enum StatusPublicacao {
  pendente
  aprovada
  recusada
}

model Organization {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now()) @map("created_at")
  nome      String
  slug      String   @unique

  membros     OrganizationMember[]
  communities Community[]

  @@map("organizations")
}

model OrganizationMember {
  id             String   @id @default(uuid())
  createdAt      DateTime @default(now()) @map("created_at")
  userId         String   @map("user_id")
  organizationId String   @map("organization_id")

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@map("organization_members")
}

// Em Community:
//   organizationId   String?          @map("organization_id")   // null = cadastrada pelo admin
//   statusPublicacao StatusPublicacao @default(aprovada)
//   autorizacaoTexto String?          @map("autorizacao_texto")  // prova do aceite (decisão 2)
//   autorizacaoEm    DateTime?        @map("autorizacao_em")
//
// Em Event:
//   canceladoEm DateTime? @map("cancelado_em")
//
// Em Rsvp:
//   checkinEm DateTime? @map("checkin_em")
```

⚠️ **`statusPublicacao` entra com default `aprovada`, não `pendente`.** As
comunidades que já existem em produção foram cadastradas por nós e não podem
sumir do site no momento do deploy. Só o que vier pelo painel nasce `pendente`
(definido na aplicação, não no default da coluna).

---

## Tarefas

1. **Migration + modelos.** Conferir a `DATABASE_URL` antes de rodar
   `migrate dev` (near-miss de 06/08: o env do PowerShell apontava pra
   produção).

2. **`lib/organizacao.ts`** — fonte única do escopo. `organizacoesDe(userId)`,
   `podeEditarComunidade(userId, communityId)`, `eventosDaOrganizacao(...)`.
   **Nenhuma página do painel consulta Prisma direto.** Toda query passa por
   aqui, que é onde o filtro de dono vive e onde o teste bate.

3. **`/painel`** — visão da organização: comunidades, próximos eventos,
   inscritos confirmados. Quem não é organizador de nada vê o convite pra
   cadastrar comunidade, não erro.

4. **Cadastro de comunidade** — formulário público pra conta logada, com o
   checkbox de autorização (decisão 2), gravando texto e timestamp. Entra
   `pendente`.

5. **Reivindicação de comunidade existente** — pedido que vai pra fila do
   admin. Nunca aprova sozinho, em hipótese nenhuma.

6. **Fila de aprovação no `/admin`** — aprovar, recusar com motivo, e ver o
   texto de autorização aceito. Recusa avisa por e-mail com o motivo.

7. **CRUD de evento no painel** — reusar a validação de `lib/admin.ts`
   (`eventAdminSchema`), sem duplicar regra. Cancelamento é status, não delete.

8. **Lista de inscritos por evento** — nome, e-mail, status, ordenada por
   inscrição, com busca e paginação (reusar `lib/admin-lista.ts`). Export CSV
   por evento, nunca global.

9. **Check-in** — tela de celular, busca por nome, toque pra marcar,
   idempotente, otimista, com indicação do que não sincronizou.

10. **E-mail de cancelamento de evento** — pra todos os inscritos ativos, com
    o motivo se houver. Pós-commit, como todo o resto.

11. **Privacidade** — declarar a finalidade do acesso do organizador aos dados
    de quem se inscreve nos eventos dele.

12. **Testes de escopo, que são o coração da story:**
    - organizador A abre evento de B por ID → **404**
    - organizador A exporta CSV de evento de B → **404**
    - listagem do painel de A nunca traz linha de B, com dois orgs semeados
    - comunidade `pendente` não aparece em `/comunidades`, `/descobrir` nem no
      sitemap
    - check-in duas vezes = uma
    - cancelar evento com fila não promove ninguém

---

## Critérios de pronto

- Conta nova cadastra comunidade, ela **não** aparece no site, admin aprova, aí
  aparece
- Reivindicação de comunidade existente **nunca** concede acesso sem aprovação
- Os quatro testes de escopo do item 12 passam — **sem eles a story não sobe**
- Comunidade cadastrada por nós antes do deploy continua visível (default
  `aprovada`)
- Cancelar evento avisa todos os inscritos e não promove fila
- Check-in funciona em tela de celular com rede ruim e não duplica
- Export de CSV só existe por evento; não há rota de export global no painel
- `npm run build`, `typecheck` e `lint` limpos

---

## Fora de escopo

QR code de check-in (ONDA 4, exige app), CNPJ/dados fiscais, planos e cobrança
(C6), múltiplos papéis dentro da organização (todo membro é organizador),
convite de membro por e-mail para a organização, edição de comunidade de
terceiros por admin delegado, relatórios e analytics do organizador,
transferência de propriedade de comunidade, e migrar o `/admin` interno pra
esta auth (segue Basic Auth de env).

---

## Handoff final

Feito / assumido / desvios / travou. Obrigatório relatar: **o resultado literal
dos quatro testes de escopo**, se algum `findMany` do painel ficou fora de
`lib/organizacao.ts` (e por quê), e como o check-in se comportou com a rede
desligada no meio da lista.
