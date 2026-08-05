"use client";

import { useEffect, useState } from "react";
import { leadSchema } from "@/lib/leads";

type Tab = "participante" | "organizador";
type Status = "idle" | "enviando" | "sucesso" | "erro";

const REGIOES = [
  "Asa Norte",
  "Asa Sul",
  "Noroeste",
  "Sudoeste",
  "Lago Norte",
  "Lago Sul",
  "Águas Claras",
  "Taguatinga",
  "Guará",
  "Outra região",
];

const inputCls =
  "w-full rounded-xl border border-areia/25 bg-white/10 px-4 py-3 text-areia placeholder:text-areia/40 focus:border-lime";

export default function LeadSection() {
  const [tab, setTab] = useState<Tab>("participante");
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);

  // Âncora #organizador (hero, header, card B2B) pré-seleciona a aba certa
  useEffect(() => {
    const aplicarHash = () => {
      if (window.location.hash === "#organizador") setTab("organizador");
    };
    aplicarHash();
    window.addEventListener("hashchange", aplicarHash);
    return () => window.removeEventListener("hashchange", aplicarHash);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    const dados = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = leadSchema.safeParse({ ...dados, tipo: tab });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Confere os campos.");
      return;
    }

    setStatus("enviando");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        setErro(json.error ?? "Não deu certo agora. Tenta de novo.");
        setStatus("erro");
        return;
      }
      setStatus("sucesso");
    } catch {
      setErro("Falha de conexão. Tenta de novo em instantes.");
      setStatus("erro");
    }
  }

  return (
    <section id="cadastro" className="bg-petroleo py-20 text-areia">
      <div className="mx-auto max-w-3xl px-5">
        <p className="eyebrow-dark mb-3">Lista de espera</p>
        <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          A MUNAY chega primeiro pra quem chega primeiro.
        </h2>
        <p className="mt-4 max-w-xl text-areia/75">
          Deixa seu contato e a gente te avisa no lançamento — com prioridade de
          acesso pra quem está na lista.
        </p>

        {/* Tabs */}
        <div
          id="organizador"
          role="tablist"
          aria-label="Tipo de cadastro"
          className="mt-10 inline-flex rounded-full border border-areia/20 p-1"
        >
          {(
            [
              ["participante", "Quero participar"],
              ["organizador", "Organizo uma comunidade"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              role="tab"
              aria-selected={tab === valor}
              onClick={() => {
                setTab(valor);
                setStatus("idle");
                setErro(null);
              }}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                tab === valor
                  ? "bg-lime text-petroleo"
                  : "text-areia/70 hover:text-areia"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {status === "sucesso" ? (
          <div className="mt-8 rounded-card border border-lime/30 bg-white/5 p-8">
            <p className="font-display text-2xl font-bold text-lime">
              Cadastro feito ✓
            </p>
            <p className="mt-2 text-areia/80">
              {tab === "participante"
                ? "Você está na lista. Te avisamos assim que a MUNAY abrir — e as primeiras comunidades da sua região estiverem no ar."
                : "Recebemos seu interesse. Vamos entrar em contato pra entender sua comunidade e te colocar entre os primeiros parceiros."}
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-6 text-sm font-semibold text-areia/70 underline underline-offset-4 hover:text-areia"
            >
              Fazer outro cadastro
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
            {/* Honeypot anti-spam — invisível para humanos */}
            <div aria-hidden="true" className="hidden">
              <label>
                Não preencha este campo
                <input name="site" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="nome" className="mb-1.5 block text-sm font-medium">
                Nome
              </label>
              <input
                id="nome"
                name="nome"
                required
                autoComplete="name"
                placeholder="Seu nome"
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="voce@email.com"
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-1">
              <label
                htmlFor="whatsapp"
                className="mb-1.5 block text-sm font-medium"
              >
                WhatsApp <span className="text-areia/50">(opcional)</span>
              </label>
              <input
                id="whatsapp"
                name="whatsapp"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(61) 9…"
                className={inputCls}
              />
            </div>

            {tab === "participante" ? (
              <>
                <div className="sm:col-span-1">
                  <label
                    htmlFor="regiao"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Sua região
                  </label>
                  <select id="regiao" name="regiao" className={inputCls}>
                    <option value="">Selecionar…</option>
                    {REGIOES.map((r) => (
                      <option key={r} value={r} className="text-petroleo">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="modalidades"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    O que você quer praticar?
                  </label>
                  <input
                    id="modalidades"
                    name="modalidades"
                    placeholder="corrida, yoga, jiu-jítsu…"
                    className={inputCls}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="sm:col-span-1">
                  <label
                    htmlFor="organizacao"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Nome da comunidade ou negócio
                  </label>
                  <input
                    id="organizacao"
                    name="organizacao"
                    required
                    placeholder="Ex.: run club, escolinha, estúdio…"
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label
                    htmlFor="modalidade"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Modalidade principal
                  </label>
                  <input
                    id="modalidade"
                    name="modalidade"
                    placeholder="corrida, jiu-jítsu, yoga…"
                    className={inputCls}
                  />
                </div>
              </>
            )}

            {erro && (
              <p role="alert" className="sm:col-span-2 text-sm text-coral">
                {erro}
              </p>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={status === "enviando"}
                className="w-full rounded-full bg-lime px-7 py-4 font-display text-lg font-bold text-petroleo transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
              >
                {status === "enviando" ? "Enviando…" : "Entrar na lista"}
              </button>
              <p className="mt-3 text-xs text-areia/50">
                Usamos seu contato só pra falar da MUNAY. Nada de spam.
              </p>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
