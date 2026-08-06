# RUNBOOK — sejamunay.com.br

Como ligar o domínio próprio no e-mail (Resend) e no site (Railway).
Escrito em 06/08/2026, quando o domínio foi comprado.

**Siga na ordem.** A ordem não é estética: fazer o passo 2 antes do 1
significa cadastrar todos os registros duas vezes, e fazer o passo 4 antes
do 3 significa mandar e-mail com link quebrado pros inscritos.

---

## Passo 0 — a decisão que define os outros

**Remetente escolhido: `ola@sejamunay.com.br` (raiz).** Decisão do tech
lead em 06/08. Mais confiável pra quem recebe; em troca, exige atenção
quando o e-mail profissional (`contato@sejamunay.com.br`) entrar depois.

**Por que o DNS não fica no Registro.br:** o Railway não publica IP fixo,
então domínio raiz só funciona com **CNAME flattening** ou registro
**ALIAS** — e o DNS do Registro.br não tem nenhum dos dois. A recomendação
é do próprio Railway: apontar os nameservers pra Cloudflare (grátis) e
gerenciar a zona lá. De quebra, os registros da Resend ficam no mesmo
painel.

O domínio continua **registrado no Registro.br** e é seu. Muda só quem
responde as consultas de DNS.

---

## Passo 1 — mover o DNS pra Cloudflare

1. Cria conta em `cloudflare.com` (plano Free serve).
2. **Add a site** → `sejamunay.com.br` → plano **Free**.
3. A Cloudflare varre a zona atual e mostra os registros encontrados.
   Domínio novo costuma vir vazio — normal.
4. Ela te dá **dois nameservers**, tipo `xxx.ns.cloudflare.com` e
   `yyy.ns.cloudflare.com`. Copia os dois.
5. No **Registro.br**: login → **Meus domínios** → `sejamunay.com.br` →
   aba **DNS** → **Alterar servidores DNS** (ou "Usar outros servidores").
   Apaga os do Registro.br e põe os dois da Cloudflare.
6. Salva e espera. Costuma valer em minutos; o Registro.br fala em até
   24h. A Cloudflare manda e-mail quando o domínio fica **Active**.

> ⚠️ Enquanto o status na Cloudflare não estiver **Active**, nada dos
> passos seguintes funciona. Não adianta cadastrar registro antes — não
> vai ser consultado por ninguém.

---

## Passo 2 — verificar o domínio na Resend

1. Resend → **Domains** → **Add Domain** → `sejamunay.com.br`.
2. **Região: `sa-east-1` (São Paulo)** se aparecer na lista. Servidor
   perto = entrega mais rápida e menos chance de filtro por latência.
3. A Resend mostra a lista de registros DNS. **Copia os valores DELA**,
   não os deste documento — a chave DKIM é única por domínio.

O formato esperado é mais ou menos este:

| Tipo | Nome | Valor |
|---|---|---|
| MX | `send` | `feedback-smtp.sa-east-1.amazonses.com` (prioridade 10) |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3...` (chave longa) |

> 🚩 **Confere isto antes de continuar:** o MX tem que cair em
> **`send.sejamunay.com.br`**, não na raiz. É assim que a Resend deixa a
> raiz livre pro seu e-mail profissional depois. **Se o painel pedir MX
> na raiz (`@`), para e me chama** — aí a escolha de remetente raiz
> conflita com Google Workspace/Zoho no futuro, e é melhor trocar pra
> subdomínio agora do que descobrir isso em outubro.

4. Na **Cloudflare** → `sejamunay.com.br` → **DNS** → **Add record**,
   cria os três. No campo **Name** você digita só a parte da esquerda
   (`send`, `resend._domainkey`) — a Cloudflare completa o domínio.
   Deixa **Proxy status = DNS only** (nuvem cinza) nos registros de
   e-mail. Nuvem laranja em MX/TXT não faz sentido e atrapalha.
5. Volta na Resend e clica **Verify**. Costuma verificar em minutos.

### Ainda no passo 2: DMARC (não pula)

Gmail e Yahoo passaram a exigir DMARC de quem manda e-mail em volume.
Sem ele, a chance de cair em spam sobe muito. Na Cloudflare:

| Tipo | Nome | Valor |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:ola@sejamunay.com.br` |

`p=none` é modo observação: não bloqueia nada, só te dá relatório. É o
começo certo — subir pra `quarantine` depois, com dado na mão.

---

## Passo 3 — o site no domínio (Railway)

1. Railway → serviço do site → **Settings** → **Networking** →
   **Custom Domain** → `sejamunay.com.br`.
2. O Railway devolve **dois** registros: um **CNAME** (algo como
   `abc123.up.railway.app`) e um **TXT** de verificação.
3. Na Cloudflare, cria os dois:
   - **CNAME** · Name `@` · Target `<o valor do Railway>` ·
     **Proxy DNS only (nuvem cinza)**
   - **TXT** · Name e valor exatamente como o Railway mandou
4. Cria também o `www`, senão quem digitar `www.sejamunay.com.br` toma
   erro: **CNAME** · Name `www` · Target `sejamunay.com.br`.
5. Espera o Railway marcar o domínio como ativo e emitir o certificado.

> ⚠️ **O TXT não é opcional.** Sem ele o CNAME resolve e o site responde
> **404** — e é um 404 que parece bug de aplicação, não de DNS. Já
> queimou tarde de muita gente.
>
> ⚠️ **Nuvem cinza, não laranja.** Com o proxy da Cloudflare ligado e o
> SSL em "Flexible", o site entra em loop de redirecionamento. Se um dia
> quiser o proxy (vale pela proteção), troca antes o **SSL/TLS** da
> Cloudflare pra **Full (strict)**.
>
> ℹ️ O CNAME na raiz só funciona porque a Cloudflare faz *flattening*.
> Era exatamente isso que o Registro.br não fazia.

---

## Passo 4 — só agora, as variáveis no Railway

Faz este passo **depois** que o site já abre em `https://sejamunay.com.br`
e o domínio está **verificado** na Resend. Antes disso, não.

```
EMAIL_PROVIDER       = resend
RESEND_API_KEY       = re_...                          (já está setada)
EMAIL_FROM           = MUNAY <ola@sejamunay.com.br>
NEXT_PUBLIC_SITE_URL = sejamunay.com.br
BETTER_AUTH_SECRET   = <openssl rand -base64 32>
```

**Por que `EMAIL_FROM` só no fim:** enquanto o domínio não está
verificado, o remetente tem que continuar `onboarding@resend.dev`. Trocar
antes faz todo envio voltar 403 — e como o `sendEmail` engole erro de
propósito, o sintoma seria silêncio, não erro.

**Por que `NEXT_PUBLIC_SITE_URL` só no fim:** essa variável é a fonte
única da URL pública (`lib/site.ts`). Ela entra no link de gestão de
inscrição dentro dos e-mails, no magic link do login, nos canonicals e no
sitemap. Trocar antes do domínio responder = e-mail saindo com link morto
pra quem já se inscreveu.

Aceita domínio sem protocolo (`sejamunay.com.br`) — o `lib/site.ts`
normaliza. Não precisa do `https://`.

---

## Passo 5 — conferir que funcionou de verdade

1. **`/admin`** — o alerta vermelho de "e-mail em modo teste" tem que ter
   **sumido**. Se ainda estiver lá, o `EMAIL_FROM` não pegou.
2. **Inscreve-se num evento com um e-mail que NÃO é o seu** (pede pro
   Mateus, ou usa outro endereço). É o único teste que prova que saiu do
   modo teste — com o seu próprio e-mail, o modo teste também entregaria.
3. **Cancela essa inscrição** e confirma que a pessoa da fila recebe o
   "Abriu vaga". Esse é o e-mail que não existia até ontem.
4. **Resend → Logs** mostra cada envio, com status de entrega. Se algo
   voltar `bounced` ou `complained`, aparece ali.
5. **Login** — pede um magic link e confere que o link no e-mail aponta
   pra `sejamunay.com.br`, não pro `.railway.app`.

---

## Depois: e-mail profissional na raiz

Quando for criar `contato@sejamunay.com.br` (Google Workspace, Zoho etc.),
o provedor vai pedir **MX na raiz**. Isso convive bem com a Resend,
porque os registros dela ficam em `send.sejamunay.com.br`.

O único ponto de atenção é o **SPF da raiz**: só pode existir **um**
registro `v=spf1` por nome. Se um dia a raiz precisar de SPF, junta tudo
num só (`v=spf1 include:_spf.google.com include:amazonses.com ~all`) em
vez de criar um segundo — dois registros SPF invalidam os dois.

---

## Se der errado

| Sintoma | Causa quase sempre |
|---|---|
| Site dá 404 com DNS certo | Falta o **TXT** de verificação do Railway |
| Loop de redirecionamento | Proxy laranja + SSL "Flexible" na Cloudflare |
| Resend não verifica | Nameserver ainda não propagou, ou registro criado no Registro.br em vez da Cloudflare |
| E-mail some sem erro | `EMAIL_FROM` ainda em `@resend.dev` — olha o `/admin` |
| Link do e-mail aponta pro railway.app | `NEXT_PUBLIC_SITE_URL` não foi trocada |
| Login para de funcionar | `BETTER_AUTH_SECRET` faltando → auth responde 503 de propósito |
