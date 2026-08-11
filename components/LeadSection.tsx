"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  abaEscura,
  BOTAO_LIME,
  CampoEscuro,
  CARD_ESCURO,
  CONTROLE_ESCURO,
} from "@/components/landing/Escuro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipBotao } from "@/components/ui/chip";
import { Input, SelectNativo } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import { leadSchema } from "@/lib/leads";
import { REGIOES_COM_OUTRA } from "@/lib/regioes";

type Tab = "participante" | "organizador";
type Status = "idle" | "enviando" | "sucesso" | "erro";

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
      track(
        parsed.data.tipo === "participante"
          ? "lead_participante"
          : "lead_organizador",
      );
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

        {/* As abas são o `<ChipBotao>` do DS — a mesma pílula que a
            `/comunidades` usa como filtro. Antes era um botão nativo com o
            ternário de classe escrito à mão; o estado ativo agora tem nome
            (`ativo`) em vez de ser uma combinação de classes.

            (O contador de `controle-cru` varre o arquivo inteiro, comentário
            junto — por isso a tag não vai escrita aqui. Prosa não pode subir
            um número que mede código.) */}
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
            <ChipBotao
              key={valor}
              role="tab"
              aria-selected={tab === valor}
              ativo={tab === valor}
              onClick={() => {
                setTab(valor);
                setStatus("idle");
                setErro(null);
              }}
              className={abaEscura(tab === valor)}
            >
              {rotulo}
            </ChipBotao>
          ))}
        </div>

        {status === "sucesso" ? (
          <Card className={`mt-8 border-lime/30 p-8 ${CARD_ESCURO}`}>
            <p className="font-display text-2xl font-bold text-lime">
              Cadastro feito ✓
            </p>
            <p className="mt-2 text-areia/80">
              {tab === "participante"
                ? "Você está na lista. Te avisamos assim que a MUNAY abrir — e as primeiras comunidades da sua região estiverem no ar."
                : "Recebemos seu interesse. Vamos entrar em contato pra entender sua comunidade e te colocar entre os primeiros parceiros."}
            </p>
            <Button
              variant="link"
              onClick={() => setStatus("idle")}
              className="mt-6 h-auto p-0 text-areia/70 hover:text-areia"
            >
              Fazer outro cadastro
            </Button>
          </Card>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
            {/* Honeypot anti-spam — invisível para humanos.
                Continua NATIVO de propósito, e é o único controle cru que
                sobra no lote: a armadilha não pode herdar classe nenhuma do
                DS. Um bot que leia CSS enxergaria a pílula de campo real e
                desconfiaria; e o `<Input>` do DS aqui mandaria estilo pra um
                elemento que ninguém vê. A isenção está nomeada em
                `tests/landing-ds.spec.ts`. */}
            <div aria-hidden="true" className="hidden">
              <label>
                Não preencha este campo
                <input name="site" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <CampoEscuro id="nome" rotulo="Nome" className="sm:col-span-1">
              <Input
                id="nome"
                name="nome"
                required
                autoComplete="name"
                placeholder="Seu nome"
                className={CONTROLE_ESCURO}
              />
            </CampoEscuro>

            <CampoEscuro id="email" rotulo="E-mail" className="sm:col-span-1">
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="voce@email.com"
                className={CONTROLE_ESCURO}
              />
            </CampoEscuro>

            <CampoEscuro
              id="whatsapp"
              rotulo="WhatsApp"
              opcional
              className="sm:col-span-1"
            >
              <Input
                id="whatsapp"
                name="whatsapp"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(61) 9…"
                className={CONTROLE_ESCURO}
              />
            </CampoEscuro>

            {tab === "participante" ? (
              <>
                <CampoEscuro
                  id="regiao"
                  rotulo="Sua região"
                  className="sm:col-span-1"
                >
                  <SelectNativo
                    id="regiao"
                    name="regiao"
                    className={CONTROLE_ESCURO}
                  >
                    <option value="">Selecionar…</option>
                    {REGIOES_COM_OUTRA.map((r) => (
                      <option key={r} value={r} className="text-petroleo">
                        {r}
                      </option>
                    ))}
                  </SelectNativo>
                </CampoEscuro>
                <CampoEscuro
                  id="modalidades"
                  rotulo="O que você quer praticar?"
                  className="sm:col-span-2"
                >
                  <Input
                    id="modalidades"
                    name="modalidades"
                    placeholder="corrida, yoga, jiu-jítsu…"
                    className={CONTROLE_ESCURO}
                  />
                </CampoEscuro>
              </>
            ) : (
              <>
                <CampoEscuro
                  id="organizacao"
                  rotulo="Nome da comunidade ou negócio"
                  className="sm:col-span-1"
                >
                  <Input
                    id="organizacao"
                    name="organizacao"
                    required
                    placeholder="Ex.: run club, escolinha, estúdio…"
                    className={CONTROLE_ESCURO}
                  />
                </CampoEscuro>
                <CampoEscuro
                  id="modalidade"
                  rotulo="Modalidade principal"
                  className="sm:col-span-1"
                >
                  <Input
                    id="modalidade"
                    name="modalidade"
                    placeholder="corrida, jiu-jítsu, yoga…"
                    className={CONTROLE_ESCURO}
                  />
                </CampoEscuro>
              </>
            )}

            {erro && (
              <p role="alert" className="sm:col-span-2 text-sm text-coral">
                {erro}
              </p>
            )}

            <div className="sm:col-span-2">
              <Button
                type="submit"
                size="lg"
                disabled={status === "enviando"}
                // `h-14` mantém a altura que a última dobra já tinha
                // (`py-4` + `text-lg`); o `size="lg"` do DS é 3rem, desenhado
                // pra ação de tela interna, não pro CTA final da landing.
                className={`h-14 w-full font-display text-lg sm:w-auto ${BOTAO_LIME}`}
              >
                {status === "enviando" ? "Enviando…" : "Entrar na lista"}
              </Button>
              <p className="mt-3 text-xs text-areia/50">
                Usamos seu contato só pra falar da MUNAY. Nada de spam. Ao
                enviar, você concorda com a{" "}
                <Link
                  href="/privacidade"
                  className="underline underline-offset-2 hover:text-areia"
                >
                  política de privacidade
                </Link>
                .
              </p>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
