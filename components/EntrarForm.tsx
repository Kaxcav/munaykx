"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Status = "idle" | "enviando" | "enviado" | "erro";

const inputCls =
  "w-full rounded-xl border border-petroleo/15 bg-white/70 px-4 py-3 text-petroleo placeholder:text-petroleo/40 focus:border-petroleo";

export default function EntrarForm({ disponivel }: { disponivel: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    const dados = Object.fromEntries(new FormData(e.currentTarget));
    // Honeypot: humano não vê este campo. Preenchido = bot → sucesso falso.
    if (typeof dados.site === "string" && dados.site.length > 0) {
      setStatus("enviado");
      return;
    }

    const alvo = String(dados.email ?? "").trim().toLowerCase();
    if (!alvo.includes("@")) {
      setErro("Confere o e-mail.");
      return;
    }

    setStatus("enviando");
    const { error } = await authClient.signIn.magicLink({
      email: alvo,
      callbackURL: "/minhas-inscricoes",
    });

    if (error) {
      // "Tenta de novo em instantes" é mentira quando o servidor respondeu
      // 503 — nesse caso o ambiente não está configurado e tentar mil vezes
      // dá no mesmo. Mensagem que manda repetir uma ação impossível faz a
      // pessoa culpar a própria internet e some com a pista do problema.
      const indisponivel = error.status === 503;
      setErro(
        indisponivel
          ? "O acesso por link ainda não está ativo neste ambiente. Não é problema seu — você pode se inscrever em eventos normalmente, sem conta."
          : "Não deu pra enviar agora. Tenta de novo em instantes.",
      );
      // O detalhe técnico vai pro console, não pra tela: quem opera precisa
      // dele, quem usa não.
      console.error("[entrar] falha no magic link:", error.status, error.message);
      setStatus("erro");
      return;
    }
    setEmail(alvo);
    setStatus("enviado");
  }

  if (status === "enviado") {
    return (
      <div className="rounded-card border border-petroleo/15 bg-white/70 p-8">
        <p className="font-display text-2xl font-bold">Confere teu e-mail ✓</p>
        <p className="mt-2 text-petroleo/70">
          {email ? (
            <>
              Mandamos um link de acesso pra <strong>{email}</strong>.
            </>
          ) : (
            "Mandamos um link de acesso."
          )}{" "}
          Ele vale por 20 minutos e só funciona uma vez.
        </p>
        <p className="mt-4 text-sm text-petroleo/50">
          Não chegou? Olha o spam — e, se não estiver lá, tenta de novo daqui a
          pouco.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md">
      {/* Honeypot anti-spam — invisível para humanos */}
      <div aria-hidden="true" className="hidden">
        <label>
          Não preencha este campo
          <input name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label htmlFor="entrar-email" className="mb-1.5 block text-sm font-medium">
        Seu e-mail
      </label>
      <input
        id="entrar-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="voce@email.com"
        disabled={!disponivel}
        className={inputCls}
      />

      {erro && (
        <p role="alert" className="mt-3 text-sm text-coral">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "enviando" || !disponivel}
        className="mt-5 w-full rounded-full bg-petroleo px-7 py-4 font-display text-lg font-bold text-areia transition-colors hover:bg-lime hover:text-petroleo disabled:opacity-50 sm:w-auto"
      >
        {status === "enviando" ? "Enviando…" : "Receber link de acesso"}
      </button>

      <p className="mt-4 text-xs text-petroleo/50">
        Sem senha. A gente manda um link no seu e-mail e pronto. Ao entrar você
        concorda com a{" "}
        <a href="/privacidade" className="underline underline-offset-4">
          política de privacidade
        </a>
        .
      </p>
    </form>
  );
}
