import { prisma } from "@/lib/db";
import { comunidadeDoUsuario } from "@/lib/organizacao";
import { DIAS, minutosParaHHMM } from "@/lib/horarios";

/**
 * PRÓXIMAS OCORRÊNCIAS + EXCEÇÕES (Frente 1 · §6.4 do ULTRAPLAN-SOCIAL).
 *
 * A grade (`HorarioRecorrente`) diz o PADRÃO semanal ("toda terça 6h15"). Aqui a
 * gente materializa as próximas DATAS concretas desse padrão e aplica as
 * exceções pontuais (`ExcecaoHorario`): a "sexta chuvosa" cancelada, o dia em
 * que o local mudou. É a base do "marcar o próximo treino" (PR3) e da tela de
 * cancelar/alterar um encontro.
 *
 * ── FUSO: TUDO EM BRASÍLIA, OFFSET FIXO −03:00 ────────────────────────────
 *
 * O DF não tem horário de verão desde 2019, então o offset é constante (o mesmo
 * que `parseDataBrasilia` de lib/admin.ts usa). Erro de fuso é o bug nº1 deste
 * projeto (ver as notas em lib/perfil.ts), então a regra aqui é dura: a grade é
 * hora-de-parede de Brasília; a data da exceção é DATA de calendário de Brasília;
 * e a comparação entre as duas é por string "YYYY-MM-DD", nunca por instante.
 */

const OFFSET_BRASILIA_MS = 3 * 60 * 60 * 1000; // UTC−3, fixo.

/** Um `Date` cujos componentes UTC são a hora-de-parede de Brasília do instante. */
function emBrasilia(instante: Date): Date {
  return new Date(instante.getTime() - OFFSET_BRASILIA_MS);
}

/** Instante (UTC real) de um dia/minuto de parede de Brasília. Espelha
 *  `parseDataBrasilia`: Brasília 06:15 → 09:15 UTC. */
function instanteDe(ano: number, mes0: number, dia: number, minutos: number): Date {
  return new Date(Date.UTC(ano, mes0, dia, 0, minutos) + OFFSET_BRASILIA_MS);
}

/** "YYYY-MM-DD" da data de calendário de Brasília de um instante. */
export function dataISOBrasilia(instante: Date): string {
  const b = emBrasilia(instante);
  return `${b.getUTCFullYear()}-${String(b.getUTCMonth() + 1).padStart(2, "0")}-${String(b.getUTCDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" de uma coluna `@db.Date` (guardada como meia-noite UTC). */
export function dataISODoBanco(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → `Date` de meia-noite UTC, pronto pra coluna `@db.Date`. */
export function isoParaDataBanco(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null; // rejeita 31/02
  return d;
}

/**
 * As próximas `n` DATAS de início de uma grade (diaSemana + minutoInicio), a
 * partir de `agora`. Pura: sem banco, testável com um `agora` fixo. Se hoje é o
 * dia mas a hora já passou, começa na semana que vem — "próximo" nunca é passado.
 */
export function proximasDatas(
  diaSemana: number,
  minutoInicio: number,
  agora: Date,
  n: number,
): Date[] {
  const b = emBrasilia(agora);
  const ano = b.getUTCFullYear();
  const mes0 = b.getUTCMonth();
  const dia = b.getUTCDate();
  const dowHoje = b.getUTCDay();
  const minutosAgora = b.getUTCHours() * 60 + b.getUTCMinutes();

  let delta = (diaSemana - dowHoje + 7) % 7;
  if (delta === 0 && minutoInicio <= minutosAgora) delta = 7; // hoje já passou

  const out: Date[] = [];
  for (let i = 0; i < n; i++) {
    // `Date.UTC` normaliza o overflow de dia/mês sozinho.
    out.push(instanteDe(ano, mes0, dia + delta + i * 7, minutoInicio));
  }
  return out;
}

// ─── Montagem das ocorrências com exceções aplicadas ──────────────────────

export type OcorrenciaConcreta = {
  horarioId: string;
  /** "YYYY-MM-DD" (Brasília) — a chave estável entre ocorrência e exceção. */
  dataISO: string;
  /** Instante de início (com a hora efetiva, já com override aplicado). */
  inicio: Date;
  diaSemanaRotulo: string;
  /** Hora efetiva "HH:MM" (override, se houver; senão a da grade). */
  horaInicio: string;
  cancelada: boolean;
  localAlterado: string | null;
  observacao: string | null;
  /** Id da exceção existente para este dia, se houver (pra desfazer). */
  excecaoId: string | null;
};

type HorarioLike = {
  id: string;
  diaSemana: number;
  minutoInicio: number;
};

type ExcecaoLike = {
  id: string;
  horarioRecorrenteId: string;
  data: Date;
  cancelada: boolean;
  localAlterado: string | null;
  minutoInicioAlterado: number | null;
  observacao: string | null;
};

/**
 * Para cada grade, as próximas `n` ocorrências com a exceção do dia aplicada.
 * Pura (recebe grade + exceções já lidas do banco), pra ser testada sem I/O.
 */
export function montarOcorrencias(
  horarios: HorarioLike[],
  excecoes: ExcecaoLike[],
  agora: Date,
  n = 4,
): OcorrenciaConcreta[] {
  // Índice (grade, dia) → exceção, pra casar em O(1) sem varrer.
  const porChave = new Map<string, ExcecaoLike>();
  for (const e of excecoes) {
    porChave.set(`${e.horarioRecorrenteId}|${dataISODoBanco(e.data)}`, e);
  }

  const out: OcorrenciaConcreta[] = [];
  for (const h of horarios) {
    for (const inicioBase of proximasDatas(h.diaSemana, h.minutoInicio, agora, n)) {
      const dataISO = dataISOBrasilia(inicioBase);
      const ex = porChave.get(`${h.id}|${dataISO}`);
      const minutoEfetivo = ex?.minutoInicioAlterado ?? h.minutoInicio;
      // Recalcula o instante se a hora foi alterada, mantendo a data.
      const inicio =
        ex?.minutoInicioAlterado != null
          ? new Date(inicioBase.getTime() + (minutoEfetivo - h.minutoInicio) * 60_000)
          : inicioBase;
      out.push({
        horarioId: h.id,
        dataISO,
        inicio,
        diaSemanaRotulo: DIAS[h.diaSemana]?.nome ?? "?",
        horaInicio: minutosParaHHMM(minutoEfetivo),
        cancelada: ex?.cancelada ?? false,
        localAlterado: ex?.localAlterado ?? null,
        observacao: ex?.observacao ?? null,
        excecaoId: ex?.id ?? null,
      });
    }
  }
  // Ordena por instante: a lista da tela é cronológica, não por grade.
  return out.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

// ─── Escrita owner-scoped ─────────────────────────────────────────────────

export type ResultadoExcecao<T = undefined> =
  | { ok: true; dados: T }
  | { ok: false; motivo: "nao-dono" | "invalido"; erro?: string };

const naoDono = { ok: false, motivo: "nao-dono" } as const;

/**
 * Confirma que a grade é de uma comunidade da pessoa. Reusa o filtro de dono de
 * `comunidadeDoUsuario` e amarra `communityId` no `where` da grade — as duas
 * coisas, igual ao `removerHorario` (a checagem sozinha já virou CVE noutro
 * projeto). Devolve o id da grade ou `null`.
 */
async function gradeDaPessoa(
  userId: string,
  slug: string,
  horarioId: string,
): Promise<string | null> {
  const com = await comunidadeDoUsuario(userId, slug);
  if (!com) return null;
  const grade = await prisma.horarioRecorrente.findFirst({
    where: { id: horarioId, communityId: com.id },
    select: { id: true },
  });
  return grade?.id ?? null;
}

/** Cancela UMA ocorrência (a "sexta chuvosa"). Idempotente via upsert na chave
 *  única (grade, data): cancelar duas vezes grava um registro só. */
export async function cancelarOcorrencia(
  userId: string,
  slug: string,
  horarioId: string,
  dataISO: string,
  observacao?: string,
): Promise<ResultadoExcecao> {
  const gradeId = await gradeDaPessoa(userId, slug, horarioId);
  if (!gradeId) return naoDono;
  const data = isoParaDataBanco(dataISO);
  if (!data) return { ok: false, motivo: "invalido", erro: "Data inválida." };

  const obs = observacao?.trim().slice(0, 200) || null;
  await prisma.excecaoHorario.upsert({
    where: { horarioRecorrenteId_data: { horarioRecorrenteId: gradeId, data } },
    create: { horarioRecorrenteId: gradeId, data, cancelada: true, observacao: obs },
    // Cancelar limpa qualquer alteração de local/hora daquele dia: cancelado é
    // cancelado, não "cancelado mas em outro lugar".
    update: { cancelada: true, localAlterado: null, minutoInicioAlterado: null, observacao: obs },
  });
  return { ok: true, dados: undefined };
}

/** Altera o local de UMA ocorrência sem cancelá-la ("hoje a saída é do outro
 *  portão"). Local vazio limpa o override. */
export async function alterarLocalOcorrencia(
  userId: string,
  slug: string,
  horarioId: string,
  dataISO: string,
  localAlterado: string,
  observacao?: string,
): Promise<ResultadoExcecao> {
  const gradeId = await gradeDaPessoa(userId, slug, horarioId);
  if (!gradeId) return naoDono;
  const data = isoParaDataBanco(dataISO);
  if (!data) return { ok: false, motivo: "invalido", erro: "Data inválida." };

  const local = localAlterado.trim().slice(0, 200) || null;
  const obs = observacao?.trim().slice(0, 200) || null;
  await prisma.excecaoHorario.upsert({
    where: { horarioRecorrenteId_data: { horarioRecorrenteId: gradeId, data } },
    create: { horarioRecorrenteId: gradeId, data, cancelada: false, localAlterado: local, observacao: obs },
    update: { cancelada: false, localAlterado: local, observacao: obs },
  });
  return { ok: true, dados: undefined };
}

/** Desfaz a exceção (reativa o encontro no padrão normal). Owner-scoped: só
 *  apaga se a exceção pertence a uma grade de uma comunidade da pessoa. */
export async function desfazerExcecao(
  userId: string,
  slug: string,
  excecaoId: string,
): Promise<ResultadoExcecao> {
  const com = await comunidadeDoUsuario(userId, slug);
  if (!com) return naoDono;
  // O `where` amarra a exceção → grade → comunidade da pessoa numa cláusula só.
  const apagadas = await prisma.excecaoHorario.deleteMany({
    where: { id: excecaoId, horarioRecorrente: { communityId: com.id } },
  });
  if (apagadas.count === 0) return naoDono;
  return { ok: true, dados: undefined };
}

/** As próximas ocorrências de uma comunidade da pessoa, com exceções aplicadas.
 *  `null` se a comunidade não é dela (→ 404). */
export async function proximasDaComunidade(
  userId: string,
  slug: string,
  agora = new Date(),
  n = 4,
): Promise<OcorrenciaConcreta[] | null> {
  const com = await comunidadeDoUsuario(userId, slug);
  if (!com) return null;
  const horarios = await prisma.horarioRecorrente.findMany({
    where: { communityId: com.id, ativo: true },
    select: { id: true, diaSemana: true, minutoInicio: true },
  });
  if (horarios.length === 0) return [];
  const excecoes = await prisma.excecaoHorario.findMany({
    where: { horarioRecorrente: { communityId: com.id } },
  });
  return montarOcorrencias(horarios, excecoes, agora, n);
}
