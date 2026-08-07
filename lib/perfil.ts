import { z } from "zod";

/**
 * PERFIL — validação compartilhada client/server (STORY-011).
 *
 * Mesmo padrão de `lib/leads.ts` e `lib/rsvps.ts`: UM schema Zod, usado no
 * formulário e na server action. Duas validações separadas divergem, e a que
 * diverge por último é sempre a do servidor — que é a que importa.
 *
 * ── ITEM 8.3 DO BRIEFING, LEVADO A SÉRIO ─────────────────────────────────
 *
 * "Feedback claro e imediato em cada campo, com linguagem amigável — não
 * mensagens de erro técnicas."
 *
 * Por isso TODA mensagem aqui é escrita pra pessoa, não pro dev. Nada de
 * "invalid format", "String must contain at least 11 character(s)" nem o
 * texto padrão do Zod. Cada `message` abaixo é copy — e diz o que fazer, não
 * só o que está errado.
 */

/** Versão da política de privacidade aceita junto com o cadastro. */
export const POLITICA_VERSAO = "2026-08-07";

/**
 * ⚠️ NÃO HÁ VALIDAÇÃO DE CPF AQUI — o campo foi removido em 07/08/2026.
 *
 * Existiam `cpfValido()` (dígito verificador de verdade, não regex) e
 * `formatarCpf()`. Foram apagados junto com o campo, e não deixados "caso
 * voltem": código morto de dado sensível é convite pra alguém religar o campo
 * sem religar a política de privacidade. O racional está no `schema.prisma`.
 */

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** "70000000" → "70000-000". */
export function formatarCep(entrada: string): string {
  const d = apenasDigitos(entrada).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

// ─── Idade ──────────────────────────────────────────────────────────────

/**
 * ⚠️ DATA DE NASCIMENTO É DATA DE CALENDÁRIO, NÃO INSTANTE NO TEMPO.
 *
 * Essa distinção parece filosófica e não é — ela produziu um bug real,
 * pego pelo teste rodando na máquina do Kaxcav (UTC−3) depois de passar no
 * container (UTC).
 *
 * O que acontecia: `<input type="date">` entrega `"2006-08-08"`, e
 * `new Date("2006-08-08")` é especificado como **meia-noite UTC**. Em
 * Brasília isso é 07/08 às 21h — então `getDate()` devolvia **7**, não 8.
 * A pessoa "nascia" um dia antes do que nasceu.
 *
 * Consequência prática, e é a que importa: o portão de idade mínima da
 * LGPD abria **um dia cedo**. Alguém com 15 anos e 364 dias passava.
 *
 * A correção é tratar a data como três números — ano, mês, dia — e nunca
 * como ponto na linha do tempo. Comparação de inteiro não tem fuso.
 */
export type PartesDeData = { ano: number; mes: number; dia: number };

/** "2006-08-08" → {ano:2006, mes:8, dia:8}. Devolve null se não for data. */
export function partesDeData(texto: string): PartesDeData | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto.trim());
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  // Rejeita 31/02: reconstrói e confere se o dia sobreviveu.
  const conferencia = new Date(Date.UTC(ano, mes - 1, dia));
  if (conferencia.getUTCMonth() !== mes - 1 || conferencia.getUTCDate() !== dia) {
    return null;
  }
  return { ano, mes, dia };
}

/**
 * Data pronta pro banco: meia-noite **UTC** do dia informado.
 *
 * A coluna é `@db.Date`. Gravar meia-noite LOCAL faria o dia mudar pra quem
 * está a leste de Greenwich — a data sairia do banco diferente da que a
 * pessoa digitou. UTC é o único ponto de referência que não depende de onde
 * o servidor está rodando.
 */
export function dataParaBanco(texto: string): Date | null {
  const p = partesDeData(texto);
  return p ? new Date(Date.UTC(p.ano, p.mes - 1, p.dia)) : null;
}

/** Idade em anos completos HOJE — "hoje" no fuso de quem está olhando. */
export function idadeDe(nascimento: PartesDeData, hoje = new Date()): number {
  // `hoje` em componentes LOCAIS de propósito: a pergunta é "que dia é hoje
  // pra essa pessoa", e ela está no fuso dela, não em UTC.
  const hojeAno = hoje.getFullYear();
  const hojeMes = hoje.getMonth() + 1;
  const hojeDia = hoje.getDate();

  let anos = hojeAno - nascimento.ano;
  if (
    hojeMes < nascimento.mes ||
    (hojeMes === nascimento.mes && hojeDia < nascimento.dia)
  ) {
    anos--;
  }
  return anos;
}

/**
 * Versão que aceita `Date` — só pra quem já tem um objeto pronto (o banco
 * devolve `Date` na coluna `@db.Date`). Lê em **UTC** porque é assim que
 * `dataParaBanco` gravou; ler local aqui reintroduziria o bug de cima.
 */
export function idadeEm(nascimento: Date, hoje = new Date()): number {
  return idadeDe(
    {
      ano: nascimento.getUTCFullYear(),
      mes: nascimento.getUTCMonth() + 1,
      dia: nascimento.getUTCDate(),
    },
    hoje,
  );
}

/**
 * IDADE MÍNIMA — 16 anos, e o número tem base legal.
 *
 * O art. 14 da LGPD trata dado de criança e adolescente em regime especial:
 * dado de CRIANÇA (até 12 anos incompletos) exige consentimento específico e
 * destacado de pelo menos um dos pais. Não existe fluxo de consentimento
 * parental no MUNAY, e construir um é projeto próprio — não linha de
 * validação.
 *
 * Então o corte é 16, com folga sobre os 12: acima disso o consentimento do
 * próprio titular sustenta o tratamento, e a plataforma não passa a
 * armazenar dado que não sabe proteger juridicamente.
 *
 * ⚠️ Isto NÃO impede menor de 16 de participar de evento: RSVP nunca exigiu
 * conta e continua não exigindo. O corte é pra CADASTRO DE PERFIL, que é
 * onde entra data de nascimento e localização.
 */
export const IDADE_MINIMA = 16;

// ─── Schema ─────────────────────────────────────────────────────────────

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

/** Campo de texto opcional: "" e "   " viram `undefined`, não string vazia. */
const textoOpcional = (max: number, mensagem: string) =>
  z
    .string()
    .trim()
    .max(max, { message: mensagem })
    .optional()
    .transform((v) => (v === "" ? undefined : v));

export const perfilSchema = z.object({
  // Nome é o único que a conta já tem preenchido (veio do RSVP ou do login),
  // então é o único obrigatório: apagar não pode ser uma opção.
  nome: z
    .string()
    .trim()
    .min(2, { message: "Coloca pelo menos o primeiro nome pra gente te chamar." })
    .max(120, { message: "Esse nome passou de 120 caracteres — dá pra encurtar?" }),

  apelido: textoOpcional(40, "Apelido de até 40 caracteres, por favor."),

  // Toda checagem abaixo passa por `partesDeData`, NUNCA por `new Date(v)` —
  // ver a nota sobre fuso lá em cima. `new Date("2006-08-08")` é meia-noite
  // UTC e vira o dia anterior em qualquer fuso a oeste de Greenwich.
  nascimento: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || partesDeData(v) !== null, {
      message: "Essa data não deu pra entender. Usa o seletor do campo?",
    })
    .refine(
      (v) => {
        if (v === undefined) return true;
        const p = partesDeData(v);
        // Data inválida já reprovou acima; aqui só interessa o futuro.
        return p === null || idadeDe(p) >= 0;
      },
      { message: "Essa data ainda não chegou 🙂" },
    )
    .refine(
      (v) => {
        if (v === undefined) return true;
        const p = partesDeData(v);
        return p === null || idadeDe(p) >= IDADE_MINIMA;
      },
      {
        message: `Pra criar perfil é preciso ter ${IDADE_MINIMA} anos ou mais. Mas você pode se inscrever nos eventos normalmente, sem conta.`,
      },
    )
    .refine(
      (v) => {
        if (v === undefined) return true;
        const p = partesDeData(v);
        return p === null || idadeDe(p) <= 120;
      },
      { message: "Essa data parece ter escapado um dígito." },
    ),

  genero: textoOpcional(40, "Até 40 caracteres aqui."),

  telefone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? apenasDigitos(v) : undefined))
    .refine((v) => v === undefined || (v.length >= 10 && v.length <= 13), {
      message: "Telefone com DDD, tipo (61) 99999-9999.",
    }),

  cep: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? apenasDigitos(v) : undefined))
    .refine((v) => v === undefined || v.length === 8, {
      message: "CEP tem 8 números, tipo 70000-000.",
    }),

  cidade: textoOpcional(80, "Nome de cidade de até 80 caracteres."),

  uf: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || (UFS as readonly string[]).includes(v), {
      message: "Use a sigla do estado, tipo DF.",
    }),

  bio: textoOpcional(
    280,
    "Passou de 280 caracteres — corta um pouquinho que fica melhor de ler.",
  ),

  perfilPublico: z.boolean().default(false),

  interesses: z
    .array(z.string())
    .max(20, { message: "Escolhe até 20 interesses — senão não é preferência, é lista." })
    .default([]),

  /** Chave → resposta das perguntas leves (item 8.2). */
  respostas: z.record(z.string(), z.string().max(200)).default({}),

  // Consentimentos. `cadastro` é o único exigido pra salvar: sem base legal,
  // não há tratamento. Os outros dois são livres e reversíveis.
  consentiuCadastro: z.boolean(),
  consentiuRecomendacao: z.boolean().default(false),
  consentiuInsights: z.boolean().default(false),
});

export type PerfilEntrada = z.input<typeof perfilSchema>;
export type PerfilValidado = z.output<typeof perfilSchema>;

/**
 * Regra que o Zod não expressa bem: o perfil PÚBLICO exige consentimento de
 * cadastro. Não dá pra aparecer pra comunidade sem ter concordado que os
 * dados são tratados.
 */
export function erroDeCoerencia(dados: PerfilValidado): string | null {
  if (!dados.consentiuCadastro) {
    return "Pra salvar o perfil, a gente precisa do seu ok no primeiro item ali embaixo.";
  }
  if (dados.perfilPublico && !dados.apelido && !dados.nome) {
    return "Perfil público sem nome fica meio estranho, né? Preenche o nome ou um apelido.";
  }
  return null;
}
