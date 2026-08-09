import Link from "next/link";
import { conteudoFresco } from "@/lib/conteudo";
import {
  CHAVES,
  REGISTRO,
  ehChave,
  type Chave,
  type FundadorConteudo,
} from "@/lib/conteudo/registro";
import { historico, rascunhoAtual } from "@/lib/conteudo/admin";
import {
  publicarAction,
  publicarRascunhoAction,
  reverterAction,
  salvarRascunhoAction,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * EDITOR DE CONTEÚDO DO SITE (ULTRAPLAN, Onda 1).
 *
 * Fluxo: salvar rascunho → conferir → publicar. Só publicar muda o site
 * público, e publicar invalida o cache — sem isso o dono veria "publicado" e o
 * site não mudaria, porque a home é estática.
 *
 * Todo valor é TEXTO PURO renderizado pelo React, que escapa por construção.
 * Não existe `dangerouslySetInnerHTML` aqui nem no que estas chaves alimentam.
 *
 * O histórico embaixo é o audit log (quem, quando, o quê) e o rollback ao
 * mesmo tempo — append-only, nada é apagado pela tela.
 */
const MAX_FUNDADORES = 6;

function EditorTexto({ chave, valor }: { chave: Chave; valor: string }) {
  return (
    <>
      <input type="hidden" name="chave" value={chave} />
      <input
        name="valor"
        defaultValue={valor}
        className="w-full rounded-lg border p-3 text-sm"
        placeholder={REGISTRO[chave].rotulo}
      />
    </>
  );
}

function EditorFundadores({
  chave,
  lista,
}: {
  chave: Chave;
  lista: readonly FundadorConteudo[];
}) {
  const linhas = Array.from(
    { length: MAX_FUNDADORES },
    (_, i) => lista[i] ?? null,
  );

  return (
    <>
      <input type="hidden" name="chave" value={chave} />
      <p className="mb-3 rounded-lg border border-destructive/30 p-3 text-xs text-destructive">
        <strong>Dado pessoal de terceiro.</strong> Só publique o perfil de
        alguém com o OK dessa pessoa. Linha sem &ldquo;autorizado por&rdquo;
        preenchido não é publicada — o campo é a prova de que houve
        consentimento.
      </p>
      <div className="space-y-4">
        {linhas.map((f, i) => (
          <fieldset key={i} className="rounded-lg border p-4">
            <legend className="px-1 text-xs text-muted-foreground">
              Fundador {i + 1}
              {f ? "" : " (vazio)"}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name={`nome_${i}`}
                defaultValue={f?.nome ?? ""}
                placeholder="Nome (vazio = remove a linha)"
                className="rounded-lg border p-2 text-sm"
              />
              <input
                name={`papel_${i}`}
                defaultValue={f?.papel ?? ""}
                placeholder="O que faz — uma linha"
                className="rounded-lg border p-2 text-sm"
              />
              <input
                name={`instagram_${i}`}
                defaultValue={f?.instagram ?? ""}
                placeholder="Instagram (handle, sem @)"
                className="rounded-lg border p-2 text-sm"
              />
              <input
                name={`link_${i}`}
                defaultValue={f?.link ?? ""}
                placeholder="https://… (LinkedIn ou site)"
                className="rounded-lg border p-2 text-sm"
              />
              <input
                name={`autorizadoPor_${i}`}
                defaultValue={f?.autorizadoPor ?? ""}
                placeholder="Autorizado por (quem deu o OK)"
                className="rounded-lg border p-2 text-sm sm:col-span-2"
              />
            </div>
          </fieldset>
        ))}
      </div>
    </>
  );
}

/** Resumo curto de um valor pro histórico — sem despejar JSON na tela. */
function resumir(valor: unknown): string {
  if (Array.isArray(valor)) {
    const nomes = valor
      .map((v) => (v && typeof v === "object" && "nome" in v ? String(v.nome) : ""))
      .filter(Boolean);
    return nomes.length ? `${nomes.length}: ${nomes.join(", ")}` : "(vazio)";
  }
  const s = String(valor ?? "");
  if (!s) return "(vazio)";
  return s.length > 80 ? `${s.slice(0, 79)}…` : s;
}

export default async function AdminConteudo({
  searchParams,
}: {
  searchParams: Promise<{ chave?: string; ok?: string; erro?: string }>;
}) {
  const { chave: chaveParam, ok, erro } = await searchParams;
  const chave: Chave =
    chaveParam && ehChave(chaveParam) ? chaveParam : (CHAVES[0] as Chave);

  const def = REGISTRO[chave];
  const [valor, rascunho, versoes] = await Promise.all([
    conteudoFresco(chave),
    rascunhoAtual(chave),
    historico(chave),
  ]);

  return (
    <>
      <h1 className="font-display text-2xl font-extrabold">Conteúdo do site</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Edite o que aparece no site sem precisar de deploy. Salvar rascunho não
        muda nada para o visitante; <strong>publicar</strong> muda na hora.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {CHAVES.map((c) => (
          <Link
            key={c}
            href={`/admin/conteudo?chave=${encodeURIComponent(c)}`}
            className={
              c === chave
                ? "rounded-full border bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                : "rounded-full border px-4 py-2 text-xs"
            }
          >
            {REGISTRO[c].rotulo}
          </Link>
        ))}
      </div>

      {ok === "publicado" ? (
        <p className="mt-6 rounded-lg border p-4 text-sm">
          Publicado ✓ — já está no ar. Confira em{" "}
          <Link href="/" className="underline underline-offset-4">
            /
          </Link>
          .
        </p>
      ) : null}
      {ok === "rascunho" ? (
        <p className="mt-6 rounded-lg border p-4 text-sm">
          Rascunho salvo ✓ — o visitante ainda vê o valor anterior.
        </p>
      ) : null}
      {ok === "revertido" ? (
        <p className="mt-6 rounded-lg border p-4 text-sm">
          Revertido ✓ — a versão anterior voltou ao ar.
        </p>
      ) : null}
      {erro ? (
        <p className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      <section className="mt-8 rounded-lg border p-5">
        <h2 className="font-display text-lg font-bold">{def.rotulo}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{def.ajuda}</p>

        <form className="mt-5">
          {def.tipo === "lista-fundadores" ? (
            <EditorFundadores
              chave={chave}
              lista={valor as readonly FundadorConteudo[]}
            />
          ) : (
            <EditorTexto chave={chave} valor={String(valor ?? "")} />
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              formAction={publicarAction}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              Publicar
            </button>
            <button
              type="submit"
              formAction={salvarRascunhoAction}
              className="rounded-full border px-5 py-2 text-sm font-semibold"
            >
              Salvar rascunho
            </button>
          </div>
        </form>

        {rascunho ? (
          <div className="mt-5 rounded-lg border border-dashed p-4">
            <p className="text-xs text-muted-foreground">
              Rascunho de {rascunho.criadoEm.toLocaleString("pt-BR")} por{" "}
              {rascunho.criadoPor} — <strong>não está no ar</strong>.
            </p>
            <p className="mt-1 text-sm">{resumir(rascunho.valor)}</p>
            <form action={publicarRascunhoAction} className="mt-3">
              <input type="hidden" name="versaoId" value={rascunho.id} />
              <input type="hidden" name="chave" value={chave} />
              <button
                type="submit"
                className="rounded-full border px-4 py-2 text-xs font-semibold"
              >
                Publicar este rascunho
              </button>
            </form>
          </div>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">Histórico</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quem mudou, o quê e quando. Nada é apagado: reverter cria uma versão
          nova com o valor antigo.
        </p>

        {versoes.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nada editado ainda — o site mostra o valor de fábrica.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {versoes.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {v.criadoEm.toLocaleString("pt-BR")} · {v.criadoPor} ·{" "}
                    {v.publicadoEm ? "publicado" : "rascunho"}
                  </p>
                  <p className="mt-1 text-sm">{resumir(v.valor)}</p>
                </div>
                {v.publicadoEm ? (
                  <form action={reverterAction}>
                    <input type="hidden" name="versaoId" value={v.id} />
                    <input type="hidden" name="chave" value={chave} />
                    <button
                      type="submit"
                      className="rounded-full border px-4 py-2 text-xs font-semibold"
                    >
                      Voltar para esta
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
