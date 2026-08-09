"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Recomendacao = {
  slug: string;
  nome: string;
  modalidade: string;
  regiao: string;
  porque: string;
};

/**
 * Campo de busca por descrição.
 *
 * Só é renderizado quando `iaDisponivel()` é true no servidor — mesma regra
 * de honestidade do e-mail: a UI não oferece o que a configuração não
 * entrega.
 *
 * O resultado vira QUERYSTRING, não estado de componente. Assim a busca por
 * descrição e a busca por filtro produzem a mesma URL, o link é
 * compartilhável e o botão voltar funciona.
 */
export default function BuscaIA({ exemplos }: { exemplos: string[] }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // As recomendações ficam NA TELA em vez de virar querystring: elas são o
  // resultado, não um recorte. Mandar a pessoa pra listagem aqui perderia
  // justamente a justificativa, que é o que a feature acrescenta.
  const [recomendacoes, setRecomendacoes] = useState<Recomendacao[]>([]);

  async function buscar(valor: string) {
    const limpo = valor.trim();
    if (limpo.length < 3 || carregando) return;

    setCarregando(true);
    setAviso(null);
    setRecomendacoes([]);

    try {
      const resp = await fetch("/api/busca-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: limpo }),
      });
      const dados = await resp.json();

      if (!dados.ok) {
        // Nunca mostra erro técnico: a busca normal existe e funciona.
        setAviso("Não consegui interpretar. Tenta pelos filtros abaixo.");
        return;
      }

      const achadas: Recomendacao[] = Array.isArray(dados.recomendacoes)
        ? dados.recomendacoes
        : [];
      if (achadas.length > 0) {
        // Achou comunidade de verdade: mostra as três com o porquê e para
        // aqui. O filtro continua disponível logo abaixo, pra quem quiser ver
        // tudo.
        setRecomendacoes(achadas);
        if (dados.observacao) setAviso(dados.observacao);
        return;
      }

      const qs = new URLSearchParams();
      if (dados.modalidade) qs.set("modalidade", dados.modalidade);
      if (dados.regiao) qs.set("regiao", dados.regiao);
      if (dados.entendimento) qs.set("ia", dados.entendimento);
      if (dados.observacao) qs.set("iaObs", dados.observacao);

      if (!dados.modalidade && !dados.regiao) {
        setAviso(
          dados.observacao ??
            "Não achei nada com esse recorte. Tenta descrever de outro jeito.",
        );
        return;
      }

      router.push(`/comunidades?${qs.toString()}`);
    } catch {
      setAviso("Não consegui interpretar. Tenta pelos filtros abaixo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="rounded-card border border-petroleo/15 bg-white/70 p-5">
      <label
        htmlFor="busca-ia"
        className="block font-display text-lg font-bold"
      >
        Descreve o que você procura
      </label>
      <p className="mt-1 text-sm text-petroleo/60">
        Escreve do seu jeito. A gente entende e filtra.
      </p>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void buscar(texto);
        }}
      >
        <input
          id="busca-ia"
          type="text"
          value={texto}
          maxLength={300}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="quero correr de manhã perto de Taguatinga"
          className="min-w-[16rem] flex-1 rounded-full border border-petroleo/20 bg-white px-5 py-3 text-sm outline-none transition-colors placeholder:text-petroleo/35 focus:border-petroleo"
        />
        <button
          type="submit"
          disabled={carregando || texto.trim().length < 3}
          className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo disabled:cursor-not-allowed disabled:opacity-40"
        >
          {carregando ? "Entendendo…" : "Buscar"}
        </button>
      </form>

      {aviso && (
        <p className="mt-3 text-sm text-petroleo/70" role="status">
          {aviso}
        </p>
      )}

      {recomendacoes.length > 0 && (
        <div className="mt-5">
          <p className="eyebrow mb-3">
            {recomendacoes.length === 1
              ? "Achei uma que combina"
              : `Achei ${recomendacoes.length} que combinam`}
          </p>
          <ul className="grid gap-3">
            {recomendacoes.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/comunidades/${r.slug}`}
                  className="block rounded-card border border-petroleo/10 bg-white p-5 transition-colors hover:border-petroleo/30"
                >
                  <p className="font-display text-lg font-bold">{r.nome}</p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60">
                    {r.modalidade} · {r.regiao}
                  </p>
                  {/* Texto do modelo: renderizado pelo React, que escapa por
                      construção. Nada de innerHTML aqui. */}
                  <p className="mt-3 text-sm leading-relaxed text-petroleo/80">
                    {r.porque}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-petroleo/45">
          exemplos
        </span>
        {exemplos.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setTexto(ex);
              void buscar(ex);
            }}
            className="rounded-full border border-petroleo/15 px-3 py-1 text-xs transition-colors hover:border-petroleo/40"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
