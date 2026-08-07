"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import Campo from "@/components/perfil/Campo";
import PainelAjuda, { type Problema } from "@/components/perfil/PainelAjuda";
import SeletorInteresses from "@/components/perfil/SeletorInteresses";
import { Button } from "@/components/ui/button";
import { SelectNativo } from "@/components/ui/input";
import { salvarPerfil, limparPerfil } from "@/app/perfil/actions";
import { formatarCep, perfilSchema } from "@/lib/perfil";
import { REGIOES_COM_OUTRA } from "@/lib/regioes";
import type { Pergunta } from "@/lib/perfil-perguntas";

/**
 * FORMULÁRIO DE PERFIL — briefing 07/08/2026, itens 8, 8.2, 8.3 e 11.
 *
 * ── A DECISÃO ESTRUTURAL: NADA É OBRIGATÓRIO, EXCETO O CONSENTIMENTO ─────
 *
 * O item 8.3 pede "prático e direto: preenchimento rápido, sem fricção" — e
 * o jeito mais rápido de matar isso seria uma tela com dez campos com
 * asterisco. Aqui o único bloqueio pra salvar é o consentimento de
 * tratamento de dados, porque sem base legal não existe tratamento. Todo o
 * resto pode ficar vazio e voltar depois.
 *
 * ── VALIDAÇÃO CONTÍNUA, EXIBIÇÃO DEPOIS DO BLUR ──────────────────────────
 *
 * O `perfilSchema` roda a cada tecla — mas o erro só APARECE no campo depois
 * que a pessoa saiu dele (`tocados`) ou depois que ela tentou salvar. Assim
 * o painel de ajuda está sempre certo (ele mostra tudo, é o painel de
 * situação) sem que o campo fique vermelho enquanto ela digita o terceiro
 * dígito do telefone.
 *
 * ── POR QUE `useTransition` E NÃO `useActionState` ───────────────────────
 *
 * A action devolve erro por CAMPO (`{ok:false, campo:"..."}`) pra focar o
 * campo certo em vez de só mostrar a mensagem no rodapé. `useActionState`
 * daria a mensagem, mas o roteamento pro campo ficaria por conta do
 * componente do mesmo jeito.
 */

export type PerfilInicial = {
  nome: string;
  apelido: string;
  nascimento: string;
  genero: string;
  telefone: string;
  cep: string;
  cidade: string;
  uf: string;
  bio: string;
  perfilPublico: boolean;
  interesses: string[];
  respostas: Record<string, string>;
  consentiuCadastro: boolean;
  consentiuRecomendacao: boolean;
  consentiuInsights: boolean;
};

/**
 * "Prefiro não dizer" saiu da lista: com o vazio rotulado "Selecionar…", eram
 * duas opções para a mesma coisa — e uma delas gravava a string "Prefiro não
 * dizer" no banco como se fosse resposta. Não responder é deixar em branco.
 */
const GENEROS = ["Mulher", "Homem", "Não-binário"];

const ROTULOS: Record<string, string> = {
  nome: "Nome",
  apelido: "Apelido",
  nascimento: "Data de nascimento",
  genero: "Gênero",
  telefone: "Telefone",
  cep: "CEP",
  cidade: "Cidade",
  uf: "Estado",
  bio: "Sobre você",
  interesses: "Interesses",
};

export default function PerfilForm({
  inicial,
  perguntas,
}: {
  inicial: PerfilInicial;
  perguntas: Pergunta[];
}) {
  const [dados, setDados] = useState<PerfilInicial>(inicial);
  /**
   * "Outro — eu escrevo" precisa de estado PRÓPRIO, e não dá pra deduzir do
   * valor. A primeira versão deduzia (`genero` fora da lista ⇒ modo livre) e
   * tinha um bug que só apareceu olhando a tela: ao apagar o último caractere
   * o valor virava "", caía de volta na lista e o campo de texto DESAPARECIA
   * embaixo do cursor de quem estava digitando.
   */
  const [generoLivre, setGeneroLivre] = useState(
    Boolean(inicial.genero) && !GENEROS.includes(inicial.genero),
  );
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);
  const [pendente, iniciar] = useTransition();

  function set<K extends keyof PerfilInicial>(chave: K, valor: PerfilInicial[K]) {
    setDados((d) => ({ ...d, [chave]: valor }));
    setSalvo(false);
  }

  /** Erros do schema, indexados por campo. Recalculado a cada tecla. */
  const errosDoSchema = useMemo(() => {
    const r = perfilSchema.safeParse(dados);
    if (r.success) return {} as Record<string, string>;
    const mapa: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const campo = issue.path[0]?.toString() ?? "_";
      // Primeiro erro por campo vence: mostrar três mensagens no mesmo
      // campo é ruído, e a primeira costuma ser a causa das outras.
      if (!mapa[campo]) mapa[campo] = issue.message;
    }
    return mapa;
  }, [dados]);

  const problemas: Problema[] = useMemo(() => {
    const lista = Object.entries(errosDoSchema).map(([campo, mensagem]) => ({
      campo,
      mensagem: `${ROTULOS[campo] ?? "Campo"}: ${mensagem}`,
    }));
    if (!dados.consentiuCadastro) {
      lista.push({
        campo: "consentiuCadastro",
        mensagem:
          "Falta seu ok pra gente guardar esses dados — é o primeiro item lá embaixo.",
      });
    }
    return lista;
  }, [errosDoSchema, dados.consentiuCadastro]);

  /** Erro visível: existe, e o campo já foi tocado ou já houve submit. */
  function erroDe(campo: keyof PerfilInicial): string | null {
    if (!tocados[campo] && !tentouSalvar) return null;
    return errosDoSchema[campo] ?? null;
  }

  const tocar = (campo: string) => () =>
    setTocados((t) => ({ ...t, [campo]: true }));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTentouSalvar(true);
    setErroGeral(null);

    if (problemas.length > 0) {
      const alvo = document.getElementById(problemas[0].campo);
      alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
      alvo?.focus({ preventScroll: true });
      return;
    }

    iniciar(async () => {
      const r = await salvarPerfil(dados);
      if (r.ok) {
        setSalvo(true);
        setTentouSalvar(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErroGeral(r.erro);
        if (r.campo) {
          setTocados((t) => ({ ...t, [r.campo!]: true }));
          document.getElementById(r.campo)?.focus();
        }
      }
    });
  }

  function onLimpar() {
    iniciar(async () => {
      const r = await limparPerfil();
      if (r.ok) window.location.reload();
      else setErroGeral(r.erro);
    });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <form onSubmit={onSubmit} noValidate className="space-y-12">
        {/* ── 8.1 · Dados cadastrais ─────────────────────────────────── */}
        <section aria-labelledby="sec-cadastro">
          <h2
            id="sec-cadastro"
            className="font-display text-2xl font-extrabold tracking-tight"
          >
            Quem é você
          </h2>
          <p className="mt-2 text-sm text-petroleo/65">
            Só o nome é necessário. O resto é seu, no seu tempo.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Campo
              id="nome"
              rotulo={ROTULOS.nome}
              valor={dados.nome}
              onChange={(v) => set("nome", v)}
              onBlur={tocar("nome")}
              erro={erroDe("nome")}
              autoComplete="name"
              placeholder="Seu nome"
            />
            <Campo
              id="apelido"
              rotulo={ROTULOS.apelido}
              valor={dados.apelido}
              onChange={(v) => set("apelido", v)}
              onBlur={tocar("apelido")}
              erro={erroDe("apelido")}
              opcional
              dica="Como a galera te chama no treino."
              placeholder="Como te chamam"
              maxLength={40}
            />
            <Campo
              id="nascimento"
              rotulo={ROTULOS.nascimento}
              valor={dados.nascimento}
              onChange={(v) => set("nascimento", v)}
              onBlur={tocar("nascimento")}
              erro={erroDe("nascimento")}
              opcional
              tipo="date"
              autoComplete="bday"
              dica="Ajuda a sugerir grupo com gente na sua fase — não aparece pra ninguém."
            />

            <div>
              <label htmlFor="genero" className="mb-1.5 block text-sm font-medium">
                {ROTULOS.genero}
                <span className="ml-1.5 font-normal text-petroleo/45">opcional</span>
              </label>
              <SelectNativo
                id="genero"
                value={generoLivre ? "outro" : dados.genero}
                onChange={(e) => {
                  const escolha = e.target.value;
                  setGeneroLivre(escolha === "outro");
                  set("genero", escolha === "outro" ? "" : escolha);
                }}
                className="border-petroleo/20"
              >
                <option value="">Selecionar…</option>
                {GENEROS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value="outro">Outro — eu escrevo</option>
              </SelectNativo>
              {generoLivre && (
                <input
                  aria-label="Escreva seu gênero"
                  value={dados.genero}
                  onChange={(e) => set("genero", e.target.value)}
                  maxLength={40}
                  placeholder="Escreve aí"
                  autoFocus
                  className="mt-2 h-11 w-full rounded-full border border-petroleo/20 bg-white px-4 text-sm"
                />
              )}
              <p className="mt-1.5 text-xs text-petroleo/50">
                Autodeclarado. Serve pra gente entender o público — nunca pra
                filtrar quem entra em quê.
              </p>
            </div>

            <Campo
              id="telefone"
              rotulo={ROTULOS.telefone}
              valor={dados.telefone}
              onChange={(v) => set("telefone", v)}
              onBlur={tocar("telefone")}
              erro={erroDe("telefone")}
              opcional
              tipo="tel"
              autoComplete="tel"
              placeholder="(61) 99999-9999"
              dica="Pra avisar de mudança de última hora no evento."
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <Campo
              id="cep"
              rotulo={ROTULOS.cep}
              valor={formatarCep(dados.cep)}
              onChange={(v) => set("cep", v)}
              onBlur={tocar("cep")}
              erro={erroDe("cep")}
              opcional
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="70000-000"
              maxLength={9}
              dica="Só o CEP. Rua e número a gente não pergunta."
            />
            <div>
              <label htmlFor="cidade" className="mb-1.5 block text-sm font-medium">
                Região / cidade
                <span className="ml-1.5 font-normal text-petroleo/45">opcional</span>
              </label>
              <SelectNativo
                id="cidade"
                value={dados.cidade}
                onChange={(e) => set("cidade", e.target.value)}
                className="border-petroleo/20"
              >
                <option value="">Selecionar…</option>
                {REGIOES_COM_OUTRA.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </SelectNativo>
              <p className="mt-1.5 text-xs text-petroleo/50">
                Pra mostrar o que rola do seu lado.
              </p>
            </div>
            <Campo
              id="uf"
              rotulo={ROTULOS.uf}
              valor={dados.uf}
              onChange={(v) => set("uf", v.toUpperCase())}
              onBlur={tocar("uf")}
              erro={erroDe("uf")}
              opcional
              maxLength={2}
              placeholder="DF"
            />
          </div>
        </section>

        {/* ── 11 · Perfil público ────────────────────────────────────── */}
        <section aria-labelledby="sec-publico">
          <h2
            id="sec-publico"
            className="font-display text-2xl font-extrabold tracking-tight"
          >
            Como a comunidade te vê
          </h2>
          <p className="mt-2 text-sm text-petroleo/65">
            Isto aqui é a parte que aparece pros outros — e só se você deixar.
          </p>

          <div className="mt-6">
            <label htmlFor="bio" className="mb-1.5 block text-sm font-medium">
              {ROTULOS.bio}
              <span className="ml-1.5 font-normal text-petroleo/45">opcional</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              value={dados.bio}
              onChange={(e) => set("bio", e.target.value)}
              onBlur={tocar("bio")}
              maxLength={280}
              rows={3}
              placeholder="Corro devagar, converso muito e sempre levo café. Bora?"
              aria-invalid={erroDe("bio") ? true : undefined}
              className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm ${
                erroDe("bio") ? "border-coral" : "border-petroleo/20"
              }`}
            />
            <div className="mt-1.5 flex justify-between gap-4">
              <p className="text-xs text-petroleo/50">
                Uma linha sobre você. Não precisa ser currículo.
              </p>
              <p
                className={`shrink-0 font-mono text-xs ${
                  dados.bio.length > 260 ? "text-coral" : "text-petroleo/40"
                }`}
              >
                {dados.bio.length}/280
              </p>
            </div>
            {erroDe("bio") && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-coral">
                ↳ {erroDe("bio")}
              </p>
            )}
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-card border border-salvia/40 bg-salvia-soft p-5">
            <input
              type="checkbox"
              checked={dados.perfilPublico}
              onChange={(e) => set("perfilPublico", e.target.checked)}
              className="mt-1 h-4 w-4 accent-salvia"
            />
            <span>
              <span className="block font-semibold">Deixar meu perfil público</span>
              <span className="mt-1 block text-sm leading-relaxed text-petroleo/70">
                Nome, apelido, descrição e interesses ficam visíveis pra quem
                está nas mesmas comunidades. Nascimento, telefone e CEP{" "}
                <strong>nunca</strong> aparecem — nem com isso ligado.
              </span>
            </span>
          </label>
        </section>

        {/* ── 11.1 · Tags ────────────────────────────────────────────── */}
        <section aria-labelledby="sec-interesses">
          <h2
            id="sec-interesses"
            className="font-display text-2xl font-extrabold tracking-tight"
          >
            No que você tá
          </h2>
          <p className="mt-2 text-sm text-petroleo/65">
            Toca no que combina com você. Dá pra mudar quando quiser.
          </p>
          <div className="mt-6">
            <SeletorInteresses
              selecionados={dados.interesses}
              onChange={(ids) => set("interesses", ids)}
            />
          </div>
        </section>

        {/* ── 8.2 · Camada de personalidade ──────────────────────────── */}
        {perguntas.length > 0 && (
          <section aria-labelledby="sec-perguntas">
            <h2
              id="sec-perguntas"
              className="font-display text-2xl font-extrabold tracking-tight"
            >
              Duas perguntas rápidas
            </h2>
            <p className="mt-2 text-sm text-petroleo/65">
              Sem resposta certa, e nenhuma é obrigatória. É só pra gente te
              conhecer além da ficha.
            </p>

            <div className="mt-6 space-y-6">
              {perguntas.map((q) => (
                <div key={q.id} className="rounded-card border border-petroleo/10 bg-white/60 p-5">
                  <p id={`q-${q.id}`} className="font-display text-lg font-bold">
                    {q.texto}
                  </p>

                  {q.opcoes ? (
                    <div
                      role="group"
                      aria-labelledby={`q-${q.id}`}
                      className="mt-3 flex flex-wrap gap-2"
                    >
                      {q.opcoes.map((op) => {
                        const marcado = dados.respostas[q.id] === op;
                        return (
                          <button
                            key={op}
                            type="button"
                            aria-pressed={marcado}
                            onClick={() =>
                              set("respostas", {
                                ...dados.respostas,
                                // Clicar de novo desmarca: responder sem
                                // querer não pode virar resposta permanente.
                                [q.id]: marcado ? "" : op,
                              })
                            }
                            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                              marcado
                                ? "border-salvia bg-salvia text-areia font-semibold"
                                : "border-petroleo/20 bg-white hover:border-petroleo/40"
                            }`}
                          >
                            {marcado && <span aria-hidden>✓ </span>}
                            {op}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      aria-labelledby={`q-${q.id}`}
                      value={dados.respostas[q.id] ?? ""}
                      onChange={(e) =>
                        set("respostas", { ...dados.respostas, [q.id]: e.target.value })
                      }
                      maxLength={200}
                      placeholder={q.exemplo}
                      className="mt-3 h-11 w-full rounded-full border border-petroleo/20 bg-white px-4 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 10 · Consentimento granular ────────────────────────────── */}
        <section aria-labelledby="sec-consentimento">
          <h2
            id="sec-consentimento"
            className="font-display text-2xl font-extrabold tracking-tight"
          >
            O que a gente pode fazer com isso
          </h2>
          <p className="mt-2 text-sm text-petroleo/65">
            Três permissões separadas, porque são três coisas diferentes. Você
            escolhe uma a uma e muda de ideia quando quiser.
          </p>

          <div className="mt-6 space-y-3">
            <Consentimento
              id="consentiuCadastro"
              marcado={dados.consentiuCadastro}
              onChange={(v) => set("consentiuCadastro", v)}
              titulo="Guardar meus dados de cadastro"
              texto={
                <>
                  Necessário pra existir perfil. Sem isso a gente não tem como
                  guardar nada — os detalhes estão na{" "}
                  <Link
                    href="/privacidade"
                    className="underline underline-offset-4"
                    target="_blank"
                  >
                    política de privacidade
                  </Link>
                  .
                </>
              }
              obrigatorio
            />
            <Consentimento
              id="consentiuRecomendacao"
              marcado={dados.consentiuRecomendacao}
              onChange={(v) => set("consentiuRecomendacao", v)}
              titulo="Usar meu histórico pra me recomendar coisas"
              texto="A gente olha em que eventos você se inscreveu pra sugerir comunidade e horário que combinam. Desligado, a MUNAY funciona igual — só sugere menos bem."
            />
            <Consentimento
              id="consentiuInsights"
              marcado={dados.consentiuInsights}
              onChange={(v) => set("consentiuInsights", v)}
              titulo="Entrar em estatísticas gerais sobre o público"
              texto="Números agregados do tipo “quantas pessoas praticam corrida no Sudoeste”, sem nome, sem e-mail e sem nada que identifique você. Nunca é vendido nem repassado individualmente."
            />
          </div>
        </section>

        {erroGeral && (
          <p
            role="alert"
            className="rounded-card border border-coral/40 bg-coral/5 p-4 text-sm font-medium text-coral"
          >
            {erroGeral}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-petroleo/10 pt-8">
          <Button type="submit" size="lg" disabled={pendente}>
            {pendente ? "Salvando…" : salvo ? "Salvo ✓" : "Salvar perfil"}
          </Button>
          <Link
            href="/minhas-inscricoes"
            className="text-sm font-medium underline underline-offset-4 hover:text-salvia-deep"
          >
            Ver minhas inscrições
          </Link>
        </div>

        {/* Direito de eliminação (LGPD art. 18) — dois passos de propósito:
            apagar perfil por engano com um clique seria péssimo. */}
        <div className="rounded-card border border-petroleo/10 bg-white/50 p-5">
          {confirmandoLimpeza ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-petroleo/75">
                Isso apaga data, telefone, CEP, descrição, interesses e
                respostas. Sua conta e suas inscrições continuam.
              </p>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onLimpar}
                disabled={pendente}
              >
                Apagar mesmo assim
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmandoLimpeza(false)}
              >
                Deixa pra lá
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoLimpeza(true)}
              className="text-sm text-petroleo/55 underline underline-offset-4 hover:text-coral"
            >
              Apagar os dados do meu perfil
            </button>
          )}
        </div>
      </form>

      <PainelAjuda problemas={problemas} salvo={salvo} />
    </div>
  );
}

function Consentimento({
  id,
  marcado,
  onChange,
  titulo,
  texto,
  obrigatorio = false,
}: {
  id: string;
  marcado: boolean;
  onChange: (v: boolean) => void;
  titulo: string;
  texto: React.ReactNode;
  obrigatorio?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-card border p-5 transition-colors ${
        marcado ? "border-salvia/50 bg-salvia-soft" : "border-petroleo/15 bg-white/50"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={marcado}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-salvia"
      />
      <span>
        <span className="block font-semibold">
          {titulo}
          {obrigatorio && (
            <span className="ml-2 font-mono text-[11px] uppercase tracking-wider text-petroleo/45">
              necessário
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-petroleo/70">
          {texto}
        </span>
      </span>
    </label>
  );
}
