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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { PaginaAdmin } from "@/components/admin/PaginaAdmin";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { Secao } from "@/components/comum/Secao";
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
      <Input
        name="valor"
        defaultValue={valor}
        placeholder={REGISTRO[chave].rotulo}
        aria-label={REGISTRO[chave].rotulo}
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
      <p className="mb-3 rounded-card border border-destructive/30 p-3 text-xs text-destructive">
        <strong>Dado pessoal de terceiro.</strong> Só publique o perfil de
        alguém com o OK dessa pessoa. Linha sem &ldquo;autorizado por&rdquo;
        preenchido não é publicada — o campo é a prova de que houve
        consentimento.
      </p>
      <div className="space-y-4">
        {linhas.map((f, i) => (
          <fieldset key={i} className="rounded-card border border-border p-4">
            <legend className="px-1 text-xs text-muted-foreground">
              Fundador {i + 1}
              {f ? "" : " (vazio)"}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                name={`nome_${i}`}
                defaultValue={f?.nome ?? ""}
                placeholder="Nome (vazio = remove a linha)"
                aria-label={`Nome do fundador ${i + 1}`}
              />
              <Input
                name={`papel_${i}`}
                defaultValue={f?.papel ?? ""}
                placeholder="O que faz — uma linha"
                aria-label={`Papel do fundador ${i + 1}`}
              />
              <Input
                name={`instagram_${i}`}
                defaultValue={f?.instagram ?? ""}
                placeholder="Instagram (handle, sem @)"
                aria-label={`Instagram do fundador ${i + 1}`}
              />
              <Input
                name={`link_${i}`}
                defaultValue={f?.link ?? ""}
                placeholder="https://… (LinkedIn ou site)"
                aria-label={`Link do fundador ${i + 1}`}
              />
              <Input
                name={`autorizadoPor_${i}`}
                defaultValue={f?.autorizadoPor ?? ""}
                placeholder="Autorizado por (quem deu o OK)"
                aria-label={`Autorizado por, fundador ${i + 1}`}
                className="sm:col-span-2"
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
    <PaginaAdmin
      eyebrow="Operação"
      titulo="Conteúdo do site"
      descricao={
        <>
          Edite o que aparece no site sem precisar de deploy. Salvar rascunho
          não muda nada para o visitante; <strong>publicar</strong> muda na
          hora.
        </>
      }
    >
      {/* Os seletores de chave são `<Chip>`: filtro que vive na URL, exatamente
          como na descoberta. Antes eram dois ternários de classe escritos à
          mão — a mesma pílula, com outro dialeto. */}
      <div className="mt-6 flex flex-wrap gap-2">
        {CHAVES.map((c) => (
          <Chip
            key={c}
            href={`/admin/conteudo?chave=${encodeURIComponent(c)}`}
            ativo={c === chave}
            tamanho="sm"
          >
            {REGISTRO[c].rotulo}
          </Chip>
        ))}
      </div>

      {ok === "publicado" ? (
        <Card className="mt-6 p-4 text-sm">
          Publicado ✓ — já está no ar. Confira em{" "}
          <Link href="/" className="underline underline-offset-4">
            /
          </Link>
          .
        </Card>
      ) : null}
      {ok === "rascunho" ? (
        <Card className="mt-6 p-4 text-sm">
          Rascunho salvo ✓ — o visitante ainda vê o valor anterior.
        </Card>
      ) : null}
      {ok === "revertido" ? (
        <Card className="mt-6 p-4 text-sm">
          Revertido ✓ — a versão anterior voltou ao ar.
        </Card>
      ) : null}
      {erro ? (
        <Card className="mt-6 border-destructive/40 p-4 text-sm text-destructive">
          {erro}
        </Card>
      ) : null}

      <Card className="mt-8 p-5">
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
            <Button type="submit" formAction={publicarAction}>
              Publicar
            </Button>
            <Button type="submit" formAction={salvarRascunhoAction} variant="outline">
              Salvar rascunho
            </Button>
          </div>
        </form>

        {rascunho ? (
          <div className="mt-5 rounded-card border border-dashed border-border p-4">
            <p className="text-xs text-muted-foreground">
              Rascunho de {rascunho.criadoEm.toLocaleString("pt-BR")} por{" "}
              {rascunho.criadoPor} — <strong>não está no ar</strong>.
            </p>
            <p className="mt-1 text-sm">{resumir(rascunho.valor)}</p>
            <form action={publicarRascunhoAction} className="mt-3">
              <input type="hidden" name="versaoId" value={rascunho.id} />
              <input type="hidden" name="chave" value={chave} />
              <Button type="submit" variant="outline" size="sm">
                Publicar este rascunho
              </Button>
            </form>
          </div>
        ) : null}
      </Card>

      <Secao
        titulo="Histórico"
        destaque
        descricao="Quem mudou, o quê e quando. Nada é apagado: reverter cria uma versão nova com o valor antigo."
      >
        {versoes.length === 0 ? (
          <EstadoVazio
            className="mt-0"
            titulo="Nada editado ainda."
            descricao="O site mostra o valor de fábrica de cada chave."
          />
        ) : (
          <ul className="space-y-2">
            {versoes.map((v) => (
              <li key={v.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                      {v.criadoEm.toLocaleString("pt-BR")} · {v.criadoPor} ·{" "}
                      {v.publicadoEm ? "publicado" : "rascunho"}
                    </p>
                    <p className="mt-1 text-sm">{resumir(v.valor)}</p>
                  </div>
                  {v.publicadoEm ? (
                    <form action={reverterAction}>
                      <input type="hidden" name="versaoId" value={v.id} />
                      <input type="hidden" name="chave" value={chave} />
                      <Button type="submit" variant="outline" size="sm">
                        Voltar para esta
                      </Button>
                    </form>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </PaginaAdmin>
  );
}
