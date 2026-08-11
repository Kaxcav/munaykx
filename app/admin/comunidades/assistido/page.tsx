import Link from "next/link";
import CadastroAssistido from "@/components/admin/CadastroAssistido";
import { PaginaAdmin } from "@/components/admin/PaginaAdmin";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { buttonVariants } from "@/components/ui/button";
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
    <PaginaAdmin
      eyebrow="Comunidades"
      titulo="Cadastro assistido"
      descricao="O organizador já escreveu tudo em algum lugar. Cole aqui em vez de digitar campo a campo."
    >
      {iaDisponivel() ? (
        <div className="mt-8">
          <CadastroAssistido salvar={salvarComunidade.bind(null, null)} />
        </div>
      ) : (
        <EstadoVazio
          titulo="A IA está desligada neste ambiente"
          descricao={
            <>
              Sem <code>ANTHROPIC_API_KEY</code> não há o que assistir. O
              cadastro manual continua valendo e é o mesmo formulário.
            </>
          }
          acao={
            <Link href="/admin/comunidades/nova" className={buttonVariants()}>
              Cadastrar manualmente
            </Link>
          }
        />
      )}
    </PaginaAdmin>
  );
}
