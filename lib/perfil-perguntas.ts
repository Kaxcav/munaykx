/**
 * CAMADA DE PERSONALIDADE — briefing 07/08/2026, item 8.2.
 *
 * "Além dos campos obrigatórios, incluir sempre uma ou outra pergunta leve —
 * uma brincadeira, um gosto pessoal, algo divertido. O objetivo é sair do
 * dado frio e capturar como a pessoa pensa. Isso diferencia o cadastro do
 * MUNAY de um formulário genérico e gera dado qualitativo aproveitável."
 *
 * ── "UMA OU OUTRA", NÃO TODAS ────────────────────────────────────────────
 *
 * O briefing diz "uma ou outra pergunta leve". Mostrar as onze de uma vez
 * transformaria a brincadeira em questionário — exatamente o formulário
 * genérico que o item 8.3 pede pra evitar ("preenchimento rápido, sem
 * fricção"). Então `perguntasDoDia()` sorteia DUAS.
 *
 * ── SORTEIO ESTÁVEL, E ISSO É UM REQUISITO TÉCNICO ───────────────────────
 *
 * O sorteio é derivado do id do usuário, não de `Math.random()`. Dois
 * motivos, nessa ordem:
 *
 * 1. O formulário é renderizado no servidor e hidratado no cliente. Random
 *    real sortearia perguntas diferentes nos dois lados e o React acusaria
 *    erro de hidratação.
 * 2. A pessoa que atualiza a página no meio do preenchimento não pode ver
 *    outras duas perguntas — o que ela já digitou sumiria da tela.
 *
 * A pergunta muda quando ela responde: respondida sai do sorteio, entra a
 * próxima. É assim que "sempre uma ou outra" acontece sem virar formulário.
 *
 * ── AS RESPOSTAS SÃO PÚBLICAS? NÃO POR PADRÃO ────────────────────────────
 *
 * Ficam no perfil (JSONB) e só aparecem pra comunidade se `perfilPublico`
 * estiver ligado. "Qual seu treino preferido pra ressaca" é dado divertido
 * pro PO e constrangedor pra pessoa se vazar sem ela ter escolhido.
 */

export type Pergunta = {
  /** Chave no JSONB. NUNCA reaproveitar id com outro significado. */
  id: string;
  texto: string;
  /** Sugestões viram chips clicáveis — responder em um toque. */
  opcoes?: string[];
  /** Quando não há opções, o placeholder do campo livre. */
  exemplo?: string;
};

export const PERGUNTAS: Pergunta[] = [
  {
    id: "horario",
    texto: "Você é do time que acorda 5h ou do que treina depois do trabalho?",
    opcoes: ["5h, sem drama", "Meio da tarde", "Depois do trabalho", "Fim de semana só"],
  },
  {
    id: "motivo",
    texto: "O que te faz sair de casa pra treinar?",
    opcoes: ["A galera", "Cabeça no lugar", "Meta esportiva", "Fugir do sedentarismo"],
  },
  {
    id: "primeira-vez",
    texto: "Como é chegar num grupo novo pra você?",
    opcoes: ["Tranquilo, puxo papo", "Fico na minha e observo", "Dá um frio na barriga"],
  },
  {
    id: "pos-treino",
    texto: "Acabou o treino. E aí?",
    opcoes: ["Café", "Cerveja", "Açaí", "Direto pra casa"],
  },
  {
    id: "playlist",
    texto: "O que toca no seu fone quando o treino aperta?",
    exemplo: "Pode ser um artista, um estilo ou 'nada, gosto do silêncio'",
  },
  {
    id: "lugar-favorito",
    texto: "Seu lugar favorito pra se mexer em Brasília?",
    exemplo: "Parque da Cidade, Eixão no domingo, orla do Lago…",
  },
  {
    id: "meta",
    texto: "Tem alguma meta pros próximos meses?",
    exemplo: "Primeira 10k, voltar a treinar, fazer amigos novos…",
  },
  {
    id: "arrasta",
    texto: "Quem você arrastaria junto pro primeiro treino?",
    opcoes: ["Vou sozinho mesmo", "Meu/minha parceiro(a)", "A galera do trabalho", "Meu cachorro"],
  },
  {
    id: "esporte-secreto",
    texto: "Tem algum esporte que você sempre quis testar e nunca testou?",
    exemplo: "Fala aí — pode ser que role em Brasília e você nem saiba",
  },
  {
    id: "domingo",
    texto: "Domingo de manhã ideal:",
    opcoes: ["Pedal no Eixão", "Praia de mentira no Lago", "Cama até meio-dia", "Feira e café"],
  },
  {
    id: "apelido-treino",
    texto: "Tem apelido no esporte? Qual?",
    exemplo: "Todo grupo tem um. Assume aí",
  },
];

const PORid = new Map(PERGUNTAS.map((p) => [p.id, p]));

export function perguntaPorId(id: string): Pergunta | undefined {
  return PORid.get(id);
}

/** Hash estável — mesmo semente, mesma ordem, em qualquer runtime. */
function embaralharPor(semente: string, total: number): number[] {
  let x = 0;
  for (let i = 0; i < semente.length; i++) x = (x * 31 + semente.charCodeAt(i)) % 104729;
  const indices = Array.from({ length: total }, (_, i) => i);
  // Fisher-Yates com PRNG determinístico (LCG) em vez de Math.random.
  for (let i = total - 1 > 0 ? total - 1 : 0; i > 0; i--) {
    x = (x * 1103515245 + 12345) % 2147483648;
    const j = x % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export const PERGUNTAS_POR_VEZ = 2;

/**
 * As perguntas da vez: prioriza as ainda não respondidas, em ordem estável
 * por usuário. Respondeu, sai da fila e entra outra.
 */
export function perguntasDoDia(
  userId: string,
  respondidas: Record<string, string> = {},
  quantidade = PERGUNTAS_POR_VEZ,
): Pergunta[] {
  const ordem = embaralharPor(userId, PERGUNTAS.length).map((i) => PERGUNTAS[i]);
  const pendentes = ordem.filter((p) => !respondidas[p.id]);
  // Todas respondidas: mostra as primeiras da ordem dela pra poder reeditar.
  return (pendentes.length > 0 ? pendentes : ordem).slice(0, quantidade);
}

/** Só chaves conhecidas, valor aparado — o JSONB não vira depósito. */
export function sanitizarRespostas(
  respostas: Record<string, unknown>,
): Record<string, string> {
  const limpo: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(respostas)) {
    if (!PORid.has(chave)) continue;
    if (typeof valor !== "string") continue;
    const texto = valor.trim().slice(0, 200);
    if (texto) limpo[chave] = texto;
  }
  return limpo;
}
