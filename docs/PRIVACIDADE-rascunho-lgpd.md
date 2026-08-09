# RASCUNHO — Política de Privacidade (LGPD), versão pós-STORY-011

> ## ⚠️ ISTO É RASCUNHO. NÃO PUBLICAR COMO ESTÁ.
>
> **Não passou por revisão jurídica.** Foi escrito por agente a partir do que o
> código realmente coleta (`prisma/schema.prisma` → `model User`, `lib/perfil.ts`,
> `components/perfil/PerfilForm.tsx`, `lib/organizacao.ts`), não a partir de
> modelo de política genérico. Isso torna o inventário de dados confiável e a
> **qualificação jurídica não**: bases legais, prazos de retenção e redação de
> direitos precisam de advogado antes de ir ao ar.
>
> **Para o Kaxcav:** revisar → ajustar com jurídico → transpor para
> `app/privacidade/page.tsx`. O texto abaixo está em prosa; a transposição é
> mecânica (as seções já batem com a estrutura de `<section>` da página atual).
>
> **Três pendências de fato que bloqueiam a publicação estão listadas no fim,
> na seção "Antes de publicar".** Uma delas (caixa de e-mail inexistente) faria
> a política prometer um canal que devolve bounce.

**Contexto:** a política em produção hoje cobre apenas nome, e-mail, WhatsApp,
região e modalidade. A STORY-011 (`feat/briefing-mateus`, commit `fade037`)
passou a coletar data de nascimento, CEP, cidade/UF, gênero, telefone, apelido,
bio, foto, tags de interesse, respostas de perguntas leves e três consentimentos
granulares. **Nada disso está declarado.** Enquanto não estiver, a branch não
deve ir para produção — é o bloqueio registrado no `QUADRO.md`.

**Versão desta política:** `2026-08-07` — precisa bater com `POLITICA_VERSAO` em
`lib/perfil.ts`, que é gravada em `users.politica_versao` no momento do aceite.
Se a redação mudar depois de alguém aceitar, **a constante muda junto**; senão a
prova documental aponta para um texto que não é o que a pessoa leu.

---

## 1. Quem é o controlador

MUNAY — plataforma de descoberta de comunidades esportivas e culturais do
Distrito Federal.

- **Canal do titular de dados:** ola@sejamunay.com.br (fonte única em
  `lib/contato.ts`)
- **Encarregado (DPO):** *[a definir — a LGPD, art. 41, exige indicar. Hoje não
  existe. Pode ser o próprio responsável legal enquanto a operação for pequena,
  mas o nome e o canal precisam estar escritos aqui.]*
- **Razão social / CNPJ / endereço:** *[a preencher — hoje não há entidade
  jurídica declarada no site. Jurídico define se entra pessoa física ou
  jurídica.]*

---

## 2. O que coletamos, para quê, e com qual base legal

A tabela abaixo é o inventário real. Cada linha existe porque há um campo
correspondente no banco.

### 2.1 · Quem só usa o site (sem conta)

| Dado | De onde vem | Para quê | Base legal (LGPD) |
|---|---|---|---|
| Nome | Lista de espera / inscrição em evento | Identificar quem é na lista e no evento | Art. 7º, V — execução de procedimento preliminar a contrato, a pedido do titular |
| E-mail | Lista de espera / inscrição em evento | Confirmar inscrição, avisar mudança e promoção de fila de espera | Art. 7º, V |
| WhatsApp (opcional) | Lista de espera / inscrição em evento | Contato rápido sobre o evento quando o e-mail não chega a tempo | Art. 7º, V |
| Região e modalidade de interesse (opcional) | Lista de espera | Priorizar em qual região e modalidade a MUNAY entra primeiro | Art. 7º, I — consentimento (campo opcional, preenchimento é o aceite) |
| Nome da comunidade e modalidade (opcional) | Lista de espera de organizadores | Avaliar parceria | Art. 7º, V |

**Inscrição em evento não exige conta e não vai exigir.** Quem se inscreve sem
conta fornece só nome, e-mail e WhatsApp opcional.

### 2.2 · Quem cria conta e preenche perfil (STORY-011)

**Todos os campos abaixo são opcionais.** A conta funciona sem perfil, e o
perfil funciona pela metade. Nenhum deles é condição para usar a MUNAY.

| Dado | Campo no banco | Para quê | Base legal |
|---|---|---|---|
| Nome | `users.name` | Identificação na conta | Art. 7º, I — consentimento |
| E-mail | `users.email` | Login por link mágico e comunicação da conta | Art. 7º, V — execução de contrato (é a credencial de acesso) |
| Telefone | `users.telefone` | Contato sobre inscrições, quando a pessoa prefere a e-mail | Art. 7º, I |
| Data de nascimento | `users.nascimento` | Faixa etária: eventos com restrição de idade e agrupamento por faixa. **Também é o que impede menor de 13 anos de criar perfil sem responsável** (art. 14) | Art. 7º, I |
| Gênero (autodeclarado, texto livre) | `users.genero` | Entender representatividade nas modalidades e orientar ações de inclusão | Art. 7º, I — **e ver §2.4 sobre dado sensível** |
| Cidade e UF | `users.cidade`, `users.uf` | Mostrar comunidades e eventos perto | Art. 7º, I |
| CEP | `users.cep` | Recomendação por proximidade dentro da cidade — a Região Administrativa sozinha é grosseira demais no DF | Art. 7º, I |
| Apelido | `users.apelido` | Como a pessoa quer ser chamada no perfil público | Art. 7º, I |
| Bio | `users.bio` | Texto livre no perfil público | Art. 7º, I |
| Foto | `users.foto_url` | Imagem no perfil público | Art. 7º, I |
| Perfil público (liga/desliga) | `users.perfil_publico` | Controla se o perfil aparece para outras pessoas. **Nasce desligado** | Art. 7º, I |
| Tags de interesse | `users.interesses` | Sugerir comunidades e eventos compatíveis | Art. 7º, I |
| Respostas das perguntas leves | `users.respostas` | Dar personalidade ao perfil público e melhorar sugestão | Art. 7º, I |

**Não coletamos documento de identidade, dado financeiro, dado bancário nem
dado de geolocalização em tempo real.**

### 2.3 · Os três consentimentos, separados

A lei não aceita consentimento em bloco para finalidades distintas (art. 8º,
§4º). São três caixas independentes, e o texto abaixo precisa espelhar
literalmente o que a tela mostra:

| Consentimento | Campo | O que autoriza | Consequência de recusar |
|---|---|---|---|
| **Guardar meus dados de cadastro** | `consentiu_cadastro` | Tratar os dados de perfil listados em §2.2 | **Obrigatório para existir perfil.** Sem ele não há base legal e nada é gravado. A conta e a inscrição em eventos continuam funcionando |
| **Usar meu histórico pra me recomendar coisas** | `consentiu_recomendacao` | Analisar em quais eventos a pessoa se inscreveu para sugerir comunidade e horário | Nenhuma. A MUNAY funciona igual, só sugere pior |
| **Entrar em estatísticas gerais sobre o público** | `consentiu_insights` | Incluir os dados em números agregados (ex.: "quantas pessoas praticam corrida no Sudoeste") — **sem nome, sem e-mail, sem nada que identifique** | Nenhuma |

Os dois últimos são **livres e reversíveis a qualquer momento** na própria tela
de perfil. Desligar não apaga o perfil; interrompe aquele uso.

**Guardamos a data e hora de cada consentimento, não um "sim".** É o que permite
provar *quando* a pessoa consentiu e *contra qual versão* desta política
(`users.politica_versao`).

**Estatísticas agregadas nunca são vendidas nem repassadas individualmente.**

### 2.4 · ⚠️ Gênero pode ser dado sensível — decisão para o jurídico

O art. 5º, II da LGPD lista como sensível o dado "referente à origem racial ou
étnica, convicção religiosa, opinião política, (…) **dado referente à saúde ou à
vida sexual**".

Gênero autodeclarado **não é automaticamente** dado sensível, mas dependendo do
que a pessoa escrever no campo (que é texto livre) pode revelar informação de
vida sexual — e dado sensível exige **consentimento destacado e específico**
(art. 11, I), não o consentimento genérico de cadastro.

**Duas saídas, e a escolha é jurídica:**
1. Tratar o campo como sensível: consentimento próprio, destacado, só para ele.
2. Manter como dado comum, com a finalidade estritamente declarada
   (representatividade e inclusão) e sem uso para segmentação individual.

Registrado aqui porque o código já grava o campo. **A escolha precisa ser feita
antes da publicação, não depois.**

### 2.5 · Menores de idade

A data de nascimento é o que permite aplicar o art. 14. **A política precisa
declarar a regra que o código aplica** — hoje há um portão de idade em
`lib/perfil.ts`, mas o texto correspondente não existe.

*[A definir com jurídico: idade mínima para conta própria, e o que acontece
entre 13 e 18. O tratamento de dado de criança exige consentimento específico e
destacado de pelo menos um dos pais ou responsável legal.]*

---

## 3. Quem tem acesso

### 3.1 · Equipe MUNAY
Acessa o necessário para operar a plataforma e responder pedidos de titular.

### 3.2 · Organizadores de comunidade (STORY-009)

**Isto precisa estar escrito e hoje não está.** O organizador de uma comunidade
vê **nome, e-mail e WhatsApp de quem se inscreveu nos eventos dele** —
finalidade legítima e concreta: avisar mudança de local, confirmar presença,
gerenciar a fila de espera.

O que o organizador **nunca** vê:
- quem se inscreveu em eventos de outra comunidade;
- leads que não se inscreveram nos eventos dele;
- qualquer número agregado da base da MUNAY;
- o perfil completo de quem se inscreveu (data de nascimento, CEP, gênero,
  respostas — nada disso aparece na lista de inscritos).

Exportação de lista é **por evento**, nunca global. A contenção é aplicada na
camada de dados (`lib/organizacao.ts`) e testada em `tests/escopo-painel.spec.ts`.

### 3.3 · Operadores (fornecedores)

| Fornecedor | Papel | O que trata |
|---|---|---|
| Railway | Hospedagem e banco de dados | Todos os dados |
| Resend | Envio de e-mail transacional | Nome e e-mail, no momento do envio |
| Umami | Métricas de uso | Dados agregados e anônimos, **sem cookie de rastreamento individual** |

*[Jurídico: confirmar se algum deles transfere dados para fora do Brasil e, em
caso positivo, incluir a cláusula de transferência internacional exigida pelos
arts. 33 a 36. Railway e Resend têm infraestrutura nos EUA — isto muito
provavelmente se aplica.]*

**Não vendemos, alugamos nem cedemos dados pessoais a terceiros.**

---

## 4. Por quanto tempo guardamos

*[Todos os prazos abaixo são proposta. Jurídico confirma.]*

| Dado | Prazo proposto | Racional |
|---|---|---|
| Conta e perfil | Enquanto a conta existir | Art. 15, IV — término a pedido do titular |
| Inscrição em evento (RSVP) | 24 meses após a data do evento | Histórico de participação e prova de que a inscrição existiu |
| Lead de lista de espera | Até a pessoa pedir exclusão, ou 24 meses sem interação | Finalidade se exaure quando não há mais contato |
| Registro de consentimento (data + versão da política) | 5 anos após a revogação | É a **prova** de que o tratamento tinha base legal. Apagar junto com o dado destruiria a defesa em fiscalização |
| Logs de acesso da aplicação | 6 meses | Art. 15 do Marco Civil da Internet |

Depois do prazo, o dado é **apagado ou anonimizado de forma irreversível**. Dado
anonimizado deixa de ser dado pessoal (art. 12) e pode continuar em estatística
agregada.

---

## 5. Direitos do titular (art. 18)

Qualquer pessoa pode, a qualquer momento e de graça:

1. **Confirmar** se tratamos dados dela;
2. **Acessar** os dados;
3. **Corrigir** dado incompleto, inexato ou desatualizado;
4. **Anonimizar, bloquear ou eliminar** dado desnecessário, excessivo ou tratado
   fora da lei;
5. **Portar** os dados a outro fornecedor, mediante requisição expressa;
6. **Eliminar** os dados tratados com base em consentimento;
7. Saber **com quem compartilhamos**;
8. Saber que pode **não consentir**, e o que acontece se não consentir;
9. **Revogar o consentimento** a qualquer momento.

**Como exercer:** e-mail para ola@sejamunay.com.br, a partir do endereço
cadastrado. Respondemos em até **15 dias** (art. 19, II).

Boa parte disso não precisa de e-mail: a tela de perfil permite ver, corrigir e
apagar os próprios dados, e ligar/desligar os dois consentimentos opcionais na
hora.

Também é direito peticionar diretamente à **ANPD** (art. 18, §1º).

---

## 6. Segurança

Conexão criptografada (HTTPS) em todo o site. Acesso ao banco restrito à equipe.
Login por link mágico — **não guardamos senha**, e os tokens de acesso ficam
gravados com hash, de modo que o vazamento dessa tabela não vira login de
ninguém.

Em caso de incidente de segurança com risco relevante, comunicamos a ANPD e os
titulares afetados (art. 48).

---

## 7. Cookies

Usamos apenas o cookie de **sessão** (mantém o login) e métricas agregadas e
anônimas via Umami. **Não há cookie de rastreamento individual, perfil de
navegação nem pixel de rede publicitária.**

---

## 8. Mudanças nesta política

Quando o texto mudar de forma relevante, avisamos por e-mail quem tem conta e
pedimos novo aceite. A versão vigente fica registrada junto com cada
consentimento, então mudar a política **não apaga** a prova de que a pessoa
concordou com a versão anterior.

---

## Antes de publicar — três pendências que não são redação

### 1. 🔴 `sejamunay.com.br` não recebe e-mail

`lib/contato.ts` registra que o domínio **não tem registro MX**. Ele envia (a
Resend está verificada), mas não recebe: e-mail mandado para
`ola@sejamunay.com.br` volta.

Publicar esta política com esse endereço como canal do titular cria um canal de
LGPD que devolve bounce — **pior que não ter canal, porque promete atendimento
que não pode acontecer**, e o prazo de 15 dias do art. 19 corre igual.

**É pendência de infraestrutura do Kaxcav, não de código.** Precisa de MX
apontando para algum provedor antes de a política ir ao ar.

### 2. 🟡 Decisões que dependem do jurídico

- Gênero é dado sensível neste contexto? (§2.4)
- Idade mínima e regra para menores entre 13 e 18 (§2.5)
- Encarregado/DPO: quem é e qual o canal (§1)
- Identificação do controlador: pessoa física ou jurídica (§1)
- Transferência internacional (Railway/Resend nos EUA) (§3.3)
- Os prazos de retenção da §4

### 3. 🟡 Sincronizar a versão

Se o jurídico mudar a redação, `POLITICA_VERSAO` em `lib/perfil.ts` muda junto.
Hoje é `"2026-08-07"`. A constante e a data no topo desta política têm que ser
sempre o mesmo valor — é o que liga o aceite gravado ao texto que a pessoa leu.

---

## Nota de rastreabilidade

Inventário de dados conferido em 07/08/2026 contra:

- `prisma/schema.prisma` → `model User`, `model Lead`, `model Rsvp`
- `prisma/migrations/20260807120000_perfil_interesses_consentimento/migration.sql`
- `lib/perfil.ts` (`POLITICA_VERSAO`, `perfilSchema`, `erroDeCoerencia`)
- `components/perfil/PerfilForm.tsx` (copy literal dos três consentimentos)
- `lib/organizacao.ts` (o que o organizador alcança)
- `lib/contato.ts` (canal do titular e a pendência de MX)

**Não menciona CPF em nenhum ponto** — o campo foi removido por decisão do
Kaxcav em 07/08/2026 e não deve voltar sem C6, finalidade real e política
reescrita. Há teste que reprova a volta do campo (`tests/perfil.spec.ts`).
