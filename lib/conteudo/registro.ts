import { z } from "zod";
import { CANAIS, EMAIL_CONTATO, type Fundador } from "@/lib/contato";

/**
 * REGISTRO DE CONTEÚDO EDITÁVEL — a espinha do CMS (ULTRAPLAN, Onda 1).
 *
 * Este arquivo é o que impede o key-value de virar depósito de strings. O
 * banco guarda VALOR; o registro aqui é dono da ESTRUTURA:
 *
 *  - `schema`  — Zod, aplicado na ESCRITA e de novo na LEITURA. Valor que não
 *                valida (formato antigo, edição manual no banco) cai no padrão
 *                em vez de derrubar a página.
 *  - `padrao`  — o valor que já estava HARDCODED. É o que faz o site com a
 *                tabela vazia ficar idêntico ao de hoje, e continuar de pé se
 *                o banco sumir (mesma regra do "sem DATABASE_URL o site sobe").
 *  - `rotulo`/`ajuda` — o que o editor mostra. Campo sem explicação vira campo
 *                preenchido errado.
 *
 * Chave que existe no banco e não existe aqui é IGNORADA. Chave daqui que não
 * existe no banco usa o padrão. Nos dois casos o site continua de pé.
 *
 * ⚠️ NUNCA guardar HTML aqui. Todo valor é texto puro, renderizado pelo React,
 * que escapa por construção. Não existe `dangerouslySetInnerHTML` para
 * conteúdo editável — a regra que a STORY-010 já provou com `<script>` real.
 */

/** Handle de rede social: o alfabeto do Instagram, e nada além. Evita que o
 *  valor escape do `https://instagram.com/<handle>` e vire outra URL. */
const handle = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9._]{1,30}$/, "Só letras, números, ponto e underline (até 30).")
  .or(z.literal(""));

/** URL de perfil pessoal. Só `https://` — `javascript:` e `data:` não existem
 *  neste alfabeto, então não é filtro que precisa acertar. */
const urlHttps = z
  .string()
  .trim()
  .url("Endereço inválido.")
  .refine((u) => u.startsWith("https://"), "Só endereço https://.")
  .or(z.literal(""));

export const fundadorSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto.").max(60),
  papel: z.string().trim().min(2, "Escreva uma linha sobre o papel.").max(80),
  instagram: handle,
  link: urlHttps,
  /**
   * G5 do ULTRAPLAN: perfil de fundador é DADO PESSOAL de terceiro. Publicar
   * exige o OK da pessoa, e o OK precisa ficar registrado — quem autorizou e
   * quando. Sem isto preenchido, a linha não é publicável.
   */
  autorizadoPor: z
    .string()
    .trim()
    .min(2, "Escreva quem autorizou expor este perfil.")
    .max(80),
});

export type FundadorConteudo = z.infer<typeof fundadorSchema>;

/**
 * Tipos de campo que o editor sabe desenhar. Guardar isto no registro (e não
 * inferir do Zod) mantém o editor burro e previsível.
 */
export type TipoCampo = "texto" | "lista-fundadores";

export type ChaveRegistro = {
  schema: z.ZodTypeAny;
  padrao: unknown;
  rotulo: string;
  ajuda: string;
  tipo: TipoCampo;
  /** Onde aparece — só pra agrupar na tela do /admin. */
  grupo: string;
};

/**
 * As chaves da Onda 1: rodapé e fundadores.
 *
 * Os padrões apontam para `lib/contato.ts`, que continua sendo a fonte do
 * valor de fábrica. Assim não existe uma segunda cópia do texto para divergir
 * em silêncio — o mesmo motivo de `lib/brand.ts` ser fonte única de cor.
 */
export const REGISTRO = {
  "rodape.email": {
    schema: z.string().trim().email("E-mail inválido.").max(120),
    padrao: EMAIL_CONTATO,
    rotulo: "E-mail de contato",
    ajuda:
      "Aparece no rodapé e na política de privacidade (canal do titular, LGPD). Precisa ser uma caixa que alguém realmente lê.",
    tipo: "texto",
    grupo: "Rodapé",
  },
  "rodape.whatsapp": {
    schema: z
      .string()
      .trim()
      .regex(/^\d{12,13}$/, "Só dígitos, com DDI e DDD. Ex.: 5561999999999.")
      .or(z.literal("")),
    padrao: CANAIS.whatsapp,
    rotulo: "WhatsApp (só dígitos, com DDI)",
    ajuda: "Ex.: 5561999999999. Vazio esconde o link do rodapé.",
    tipo: "texto",
    grupo: "Rodapé",
  },
  "rodape.telefone": {
    schema: z.string().trim().max(24).or(z.literal("")),
    padrao: CANAIS.telefone,
    rotulo: "Telefone (como deve aparecer)",
    ajuda: "Ex.: (61) 99999-9999. Vazio esconde a linha.",
    tipo: "texto",
    grupo: "Rodapé",
  },
  "rodape.instagram": {
    schema: handle,
    padrao: CANAIS.instagram,
    rotulo: "Instagram (handle, sem @)",
    ajuda:
      "Ex.: sejamunay. Confira antes de publicar: handle errado manda o tráfego pro perfil de outra pessoa.",
    tipo: "texto",
    grupo: "Rodapé",
  },
  "rodape.fundadores": {
    schema: z.array(fundadorSchema).max(6),
    padrao: [] as FundadorConteudo[],
    rotulo: "Fundadores",
    ajuda:
      "Perfil pessoal é dado de terceiro: só publique com o OK de cada pessoa, e registre quem autorizou.",
    tipo: "lista-fundadores",
    grupo: "Rodapé",
  },
} as const satisfies Record<string, ChaveRegistro>;

export type Chave = keyof typeof REGISTRO;

export const CHAVES = Object.keys(REGISTRO) as Chave[];

export function ehChave(valor: string): valor is Chave {
  return Object.prototype.hasOwnProperty.call(REGISTRO, valor);
}

/** Tipo do valor de uma chave, inferido do próprio Zod do registro. */
export type ValorDe<K extends Chave> = z.infer<(typeof REGISTRO)[K]["schema"]>;

/**
 * Versão do FORMATO de cada chave. Subir este número quando o formato mudar
 * (não quando o texto mudar): versões antigas gravadas continuam legíveis
 * porque a leitura valida com Zod e cai no padrão se não validar.
 */
export const VERSAO_SCHEMA = 1;

/** O `Fundador` que o `<Footer />` já consome — o CMS não muda o componente. */
export function paraFundadorDoFooter(f: FundadorConteudo): Fundador {
  return { nome: f.nome, papel: f.papel, instagram: f.instagram, link: f.link };
}
