import Link from "next/link";
import CadastroAssistido from "@/components/admin/CadastroAssistido";
import { iaDisponivel } from "@/lib/ai";
import { salvarComunidade } from "../actions";

export const dynamic = "force-dynamic";

/**
 * `/admin/comunidades/assistido` — cadastro de parceiro em 30 segundos.
 *
 * Com a IA desligada a página não finge: diz que está desligada e manda pro
 * cadastro manual, que sempre funcionou. Mesma regra do e-mail — a UI só
 * promete o que o ambiente entrega.
 */
export default function CadastroAssistidoPage() {
  return (
    <>
      <p className="eyebrow mb-3">Comunidades</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Cadastro assistido
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        O organizador já escreveu tudo em algum lugar. Cole aqui em vez de
        digitar campo a campo.
      </p>

      {iaDisponivel() ? (
        <div className="mt-8">
          <CadastroAssistido salvar={salvarComunidade.bind(null, null)} />
        </div>
      ) : (
        <div className="mt-8 max-w-2xl rounded-lg border p-5">
          <p className="font-semibold">A IA está desligada neste ambiente</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Sem <code>ANTHROPIC_API_KEY</code> não há o que assistir. O cadastro
            manual continua valendo e é o mesmo formulário.
          </p>
          <Link
            href="/admin/comunidades/nova"
            className="mt-5 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Cadastrar manualmente
          </Link>
        </div>
      )}

      <Link
        href="/admin/comunidades"
        className="mt-10 inline-block font-mono text-xs uppercase tracking-wider text-muted-foreground"
      >
        ← Comunidades
      </Link>
    </>
  );
}
