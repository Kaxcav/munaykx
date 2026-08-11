import Link from "next/link";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadesDoUsuario } from "@/lib/organizacao";
import { iaDisponivel } from "@/lib/ai";
import { Pagina } from "@/components/comum/Pagina";
import { Button } from "@/components/ui/button";
import { Input, SelectNativo } from "@/components/ui/input";
import { Aviso } from "@/components/painel/Aviso";
import { Campo, CampoCheck } from "@/components/painel/Campo";
import CampoDuracao from "@/components/painel/CampoDuracao";
import CampoModoRota from "@/components/painel/CampoModoRota";
import { slugify } from "@/lib/slug";
import { criarEventoAction } from "../../actions";

/**
 * Novo evento. O select de comunidade é populado SÓ com as comunidades da
 * pessoa — e a action reconfere o dono no servidor, então mesmo um POST com
 * `communityId` de terceiro é barrado (vira 404/`nao-dono`).
 */
export default async function NovoEvento({
  searchParams,
}: {
  searchParams: Promise<{
    comunidade?: string;
    erro?: string;
    // Pré-preenchimento do "marcar este treino" (PR3): a grade sugere tudo, o
    // organizador só confirma. `horarioId` vincula o evento à grade (dedup).
    startsAt?: string;
    titulo?: string;
    local?: string;
    duracaoMin?: string;
    horarioId?: string;
    // Retorno do fluxo Flyer → evento: `doFlyer` marca que veio do cartaz,
    // `flyerObs` é o que a IA pediu pra revisar, `flyerFalhou` é a mensagem
    // quando não deu pra ler (form em branco, nada salvo).
    doFlyer?: string;
    flyerObs?: string;
    flyerFalhou?: string;
  }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const comunidades = await comunidadesDoUsuario(sessao.user.id);
  if (comunidades.length === 0) redirect("/painel");

  const {
    comunidade, erro, startsAt, titulo, local, duracaoMin, horarioId,
    doFlyer, flyerObs, flyerFalhou,
  } = await searchParams;
  const selecionada =
    comunidades.find((c) => c.slug === comunidade) ?? comunidades[0];
  const preMarcar = Boolean(startsAt); // veio do "marcar este treino"
  const veioDoFlyer = Boolean(doFlyer); // veio do cartaz (IA de visão)
  // Slug sugerido quando algo foi pré-preenchido (grade ou flyer): título + dia,
  // pra o organizador não ter que inventar um. Editável; unicidade no servidor.
  const slugSugerido =
    (preMarcar || veioDoFlyer) && titulo
      ? slugify(
          `${titulo}${startsAt ? `-${startsAt.slice(0, 10).replace(/-/g, "")}` : ""}`,
        )
      : "";

  return (
    <Pagina eyebrow="Novo evento" titulo="Criar evento">
      {iaDisponivel() && !preMarcar && !veioDoFlyer ? (
        <p className="mt-4 text-sm">
          <Link
            href="/painel/eventos/flyer"
            className="font-semibold underline underline-offset-4 hover:opacity-70"
          >
            📸 Tem o cartaz? Manda o print e a gente pré-preenche →
          </Link>
        </p>
      ) : null}

      {preMarcar ? (
        <Aviso tom="destaque">
          Puxamos os dados da sua grade. Confira e <strong>é só publicar</strong> —
          depois a gente te dá o texto pronto pro WhatsApp.
        </Aviso>
      ) : null}
      {veioDoFlyer ? (
        <Aviso tom="destaque">
          <p>
            Lemos o cartaz e pré-preenchemos o que deu.{" "}
            <strong>Confira tudo antes de publicar</strong> — campos que não
            estavam no cartaz ficaram em branco.
          </p>
          {flyerObs ? (
            <p className="mt-2">
              <span className="font-semibold">Revisar:</span> {flyerObs}
            </p>
          ) : null}
        </Aviso>
      ) : null}
      {flyerFalhou ? (
        <Aviso className="text-foreground/80">{flyerFalhou}</Aviso>
      ) : null}
      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

      <form action={criarEventoAction} className="mt-8 space-y-4">
        <input type="hidden" name="comunidadeSlug" value={selecionada.slug} />
        {horarioId ? (
          <input type="hidden" name="horarioRecorrenteId" value={horarioId} />
        ) : null}
        <Campo rotulo="Comunidade">
          <SelectNativo name="communityId" defaultValue={selecionada.id}>
            {comunidades.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Título">
          <Input name="titulo" required defaultValue={titulo ?? ""} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Slug (na URL)">
            <Input
              name="slug"
              required
              defaultValue={slugSugerido}
              placeholder="treino-domingo-parque"
            />
          </Campo>
          <Campo rotulo="Data e hora">
            <Input
              type="datetime-local"
              name="startsAt"
              required
              defaultValue={startsAt ?? ""}
            />
          </Campo>
          <Campo rotulo="Local">
            <Input name="local" defaultValue={local ?? ""} />
          </Campo>
          <Campo rotulo="Capacidade" dica="Vazio = sem limite.">
            <Input name="capacidade" type="number" min={1} />
          </Campo>
          <CampoDuracao defaultValue={duracaoMin ?? ""} />
        </div>
        <CampoModoRota />
        <CampoCheck nome="gratuito" defaultChecked rotulo="Gratuito" />
        <Button type="submit">Criar evento</Button>
      </form>
    </Pagina>
  );
}
