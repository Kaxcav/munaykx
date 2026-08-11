"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "idle" | "enviando" | "enviado" | "erro";

export default function EntrarForm({
  disponivel,
  callbackURL = "/minhas-inscricoes",
}: {
  disponivel: boolean;
  callbackURL?: string;
}) {
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
      callbackURL,
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
      <Card className="bg-card/70 p-8">
        <p className="font-display text-2xl font-bold">Confere teu e-mail ✓</p>
        <p className="mt-2 text-foreground/70">
          {email ? (
            <>
              Mandamos um link de acesso pra <strong>{email}</strong>.
            </>
          ) : (
            "Mandamos um link de acesso."
          )}{" "}
          Ele vale por 20 minutos e só funciona uma vez.
        </p>
        <p className="mt-4 text-sm text-foreground/50">
          Não chegou? Olha o spam — e, se não estiver lá, tenta de novo daqui a
          pouco.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md">
      {/*
        Honeypot anti-spam — invisível para humanos.

        Fica `<input>` NATIVO de propósito, e é a única isenção deste arquivo
        (travada em `tests/usuario-ds.spec.ts`): o campo mora dentro de um
        `div.hidden aria-hidden`, ninguém o enxerga, e a única coisa que
        `<Input>` traria são classes de aparência para algo sem aparência. É a
        mesma natureza do `type="hidden"` que o guardrail global já isenta.
      */}
      <div aria-hidden="true" className="hidden">
        <label>
          Não preencha este campo
          <input name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Label htmlFor="entrar-email" className="mb-1.5 font-medium">
        Seu e-mail
      </Label>
      <Input
        id="entrar-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="voce@email.com"
        disabled={!disponivel}
        // O campo era `rounded-xl py-3` à mão; o `<Input>` é `h-11
        // rounded-full`. Alinha com o resto do site (a busca da /comunidades,
        // o filtro do /admin) — é justamente a deriva que a rodada existe pra
        // fechar. Nenhuma cor muda: `bg-card` e `border-input` derivam dos
        // mesmos valores de `lib/brand.ts` que o `bg-white/70
        // border-petroleo/15` de antes.
        className="bg-card/70"
      />

      {erro && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      <Button
        type="submit"
        disabled={status === "enviando" || !disponivel}
        // Mesma medida de antes (ver a nota gêmea no ConfirmarEntrada): esta
        // é a ação principal da tela, e nenhum `size` do DS tem esta altura.
        className="mt-5 h-auto w-full px-7 py-4 font-display text-lg font-bold sm:w-auto"
      >
        {status === "enviando" ? "Enviando…" : "Receber link de acesso"}
      </Button>

      <p className="mt-4 text-xs text-foreground/50">
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
