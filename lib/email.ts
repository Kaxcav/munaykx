import { brand } from "@/lib/brand";

/**
 * Fonte única de envio de e-mail (STORY-007, tarefa 1).
 *
 * O provedor é decidido por env, nunca no código, e o remetente NUNCA é
 * hardcoded — quando o domínio próprio sair, muda `EMAIL_FROM` no Railway e
 * pronto: zero alteração de código.
 *
 *   EMAIL_PROVIDER=smtp    → Nodemailer (dev/CI: Mailpit em docker compose)
 *   EMAIL_PROVIDER=resend  → Resend (smoke real; sem domínio, use
 *                            onboarding@resend.dev, que só entrega pro
 *                            e-mail da própria conta)
 *   (não definido)         → no-op logado: o app sobe e nada quebra, mesmo
 *                            padrão do DATABASE_URL e do Umami
 */

export type EmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailResult =
  | { ok: true; provider: "smtp" | "resend" }
  | { ok: false; motivo: "nao-configurado" | "erro" };

const REMETENTE_PADRAO = "MUNAY <onboarding@resend.dev>";

function remetente(): string {
  return process.env.EMAIL_FROM?.trim() || REMETENTE_PADRAO;
}

/**
 * `onboarding@resend.dev` é o remetente de TESTE da Resend: ele só entrega
 * para o e-mail dono da conta. Qualquer outro destinatário volta 403.
 *
 * Isso é uma armadilha de verdade, porque o nosso `sendEmail` engole erro
 * de propósito (e-mail não pode derrubar inscrição). Sem esta checagem, o
 * dono da conta testaria, receberia o e-mail, concluiria "funciona" — e
 * todo participante real receberia silêncio, com o 403 escondido no log.
 *
 * Enquanto o remetente for de teste, o app se trata como SEM e-mail: a UI
 * para de prometer aviso. Prometer o que não entrega é pior que não ter.
 */
function remetenteDeTeste(): boolean {
  return /@resend\.dev\b/i.test(remetente());
}

async function viaSmtp(input: EmailInput): Promise<EmailResult> {
  const url = process.env.SMTP_URL;
  if (!url) {
    console.warn("[email] EMAIL_PROVIDER=smtp sem SMTP_URL — nada enviado.");
    return { ok: false, motivo: "nao-configurado" };
  }
  // import dinâmico: nodemailer só entra no bundle de quem usa smtp
  const { createTransport } = await import("nodemailer");

  // A URL é desmontada em opções explícitas de propósito: o segundo
  // argumento de createTransport() é default de MENSAGEM, não de conexão —
  // passar `tls` ali não tem efeito nenhum (custou um bug em teste).
  const u = new URL(url);
  const ehProducao = process.env.NODE_ENV === "production";
  const transport = createTransport({
    host: u.hostname,
    port: Number(u.port) || 587,
    secure: u.protocol === "smtps:",
    auth: u.username
      ? {
          user: decodeURIComponent(u.username),
          pass: decodeURIComponent(u.password),
        }
      : undefined,
    // Caixa de entrada local (Mailpit e afins) anuncia STARTTLS com
    // certificado autoassinado. Fora de produção aceitamos; em produção
    // NUNCA — lá o certificado tem que valer.
    ...(ehProducao ? {} : { tls: { rejectUnauthorized: false } }),
  });
  await transport.sendMail({
    from: remetente(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  return { ok: true, provider: "smtp" };
}

async function viaResend(input: EmailInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] EMAIL_PROVIDER=resend sem RESEND_API_KEY — nada enviado.");
    return { ok: false, motivo: "nao-configurado" };
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: remetente(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (error) throw new Error(error.message);
  return { ok: true, provider: "resend" };
}

/**
 * Envia um e-mail. NUNCA lança para o chamador: e-mail que falha não pode
 * derrubar login nem inscrição. Falha vira log + retorno `ok: false`.
 */
export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (provider !== "smtp" && provider !== "resend") {
    console.info(
      `[email] EMAIL_PROVIDER não configurado — e-mail para ${input.to} não foi enviado.`,
      `Assunto: ${input.subject}`,
    );
    return { ok: false, motivo: "nao-configurado" };
  }

  if (remetenteDeTeste()) {
    console.warn(
      `[email] MODO TESTE: remetente ${remetente()} só entrega pro dono da conta Resend.`,
      `O envio para ${input.to} vai falhar com 403 se não for esse endereço.`,
    );
  }

  try {
    return provider === "smtp" ? await viaSmtp(input) : await viaResend(input);
  } catch (error) {
    console.error(
      `[email] falha ao enviar via ${provider}:`,
      error instanceof Error ? error.message : error,
    );
    return { ok: false, motivo: "erro" };
  }
}

/**
 * True quando o e-mail chega em QUALQUER pessoa — a UI usa isto pra ser
 * honesta. Não basta ter provedor: com o remetente de teste da Resend a
 * entrega é só pro dono da conta, e prometer aviso ali seria mentira.
 */
export function emailConfigurado(): boolean {
  const p = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (p === "smtp") return Boolean(process.env.SMTP_URL);
  if (p === "resend")
    return Boolean(process.env.RESEND_API_KEY) && !remetenteDeTeste();
  return false;
}

/**
 * Diagnóstico pro /admin e pro log de boot: em uma linha, o que o e-mail
 * está fazendo agora. Existe porque "configurado" tem três estados, não
 * dois, e o do meio (teste) é o que engana.
 */
export function statusEmail(): {
  modo: "desligado" | "teste" | "producao";
  detalhe: string;
} {
  const p = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (p !== "smtp" && p !== "resend")
    return {
      modo: "desligado",
      detalhe:
        "EMAIL_PROVIDER não configurado — nenhum e-mail sai, e a UI não promete aviso.",
    };
  if (p === "resend" && !process.env.RESEND_API_KEY)
    return { modo: "desligado", detalhe: "EMAIL_PROVIDER=resend sem RESEND_API_KEY." };
  if (p === "smtp" && !process.env.SMTP_URL)
    return { modo: "desligado", detalhe: "EMAIL_PROVIDER=smtp sem SMTP_URL." };
  if (remetenteDeTeste())
    return {
      modo: "teste",
      detalhe: `Remetente ${remetente()} só entrega pro dono da conta Resend. Verifique um domínio e troque EMAIL_FROM pra valer pra todo mundo.`,
    };
  return { modo: "producao", detalhe: `Enviando via ${p} como ${remetente()}.` };
}

/**
 * Layout único dos e-mails transacionais, com os tokens de `lib/brand.ts`
 * (regra 4: hex só vem de lá). E-mail não entende classe do Tailwind, então
 * aqui é style inline mesmo — mas os valores continuam vindo de um arquivo só.
 */
export function layoutEmail(opts: {
  titulo: string;
  corpo: string;
  botao?: { rotulo: string; url: string };
  rodape?: string;
}): { html: string; text: string } {
  const { titulo, corpo, botao, rodape } = opts;

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:${brand.areia};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${brand.petroleo}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.areia};padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${brand.petroleo}1a;border-radius:20px;padding:32px">
            <tr>
              <td>
                <p style="margin:0 0 24px;font-size:20px;font-weight:800;letter-spacing:-0.01em;color:${brand.petroleo}">MUNAY</p>
                <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;line-height:1.25;color:${brand.petroleo}">${titulo}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${brand.petroleo}b3">${corpo}</p>
                ${
                  botao
                    ? `<a href="${botao.url}" style="display:inline-block;background:${brand.petroleo};color:${brand.areia};text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px">${botao.rotulo}</a>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:${brand.petroleo}80">Se o botão não funcionar, copie este endereço no navegador:<br><span style="word-break:break-all">${botao.url}</span></p>`
                    : ""
                }
                ${
                  rodape
                    ? `<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid ${brand.petroleo}14;font-size:12px;line-height:1.5;color:${brand.petroleo}80">${rodape}</p>`
                    : ""
                }
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-size:11px;color:${brand.petroleo}66">MUNAY · Brasília · DF</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "MUNAY",
    "",
    titulo,
    "",
    corpo.replace(/<[^>]+>/g, ""),
    botao ? `\n${botao.rotulo}: ${botao.url}` : "",
    rodape ? `\n${rodape.replace(/<[^>]+>/g, "")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}
