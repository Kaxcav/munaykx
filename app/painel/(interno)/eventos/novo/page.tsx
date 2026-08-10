import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadesDoUsuario } from "@/lib/organizacao";
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
  }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const comunidades = await comunidadesDoUsuario(sessao.user.id);
  if (comunidades.length === 0) redirect("/painel");

  const { comunidade, erro, startsAt, titulo, local, duracaoMin, horarioId } =
    await searchParams;
  const selecionada =
    comunidades.find((c) => c.slug === comunidade) ?? comunidades[0];
  const preMarcar = Boolean(startsAt); // veio do "marcar este treino"
  // Slug sugerido quando veio da grade: título + dia, pra o organizador não ter
  // que inventar um. Continua editável e a unicidade é checada no servidor.
  const slugSugerido =
    preMarcar && titulo
      ? slugify(`${titulo}-${(startsAt ?? "").slice(0, 10).replace(/-/g, "")}`)
      : "";

  return (
    <>
      <p className="eyebrow">Novo evento</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
        Criar evento
      </h1>

      {preMarcar ? (
        <p className="mt-6 rounded-xl border border-salvia bg-salvia-soft p-4 text-sm text-petroleo/80">
          Puxamos os dados da sua grade. Confira e{" "}
          <strong>é só publicar</strong> — depois a gente te dá o texto pronto pro
          WhatsApp.
        </p>
      ) : null}
      {erro ? (
        <p className="mt-6 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      <form action={criarEventoAction} className="mt-8 space-y-4">
        <input type="hidden" name="comunidadeSlug" value={selecionada.slug} />
        {horarioId ? (
          <input type="hidden" name="horarioRecorrenteId" value={horarioId} />
        ) : null}
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Comunidade</span>
          <select
            name="communityId"
            defaultValue={selecionada.id}
            className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
          >
            {comunidades.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Título</span>
          <input
            name="titulo"
            required
            defaultValue={titulo ?? ""}
            className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">
              Slug (na URL)
            </span>
            <input
              name="slug"
              required
              defaultValue={slugSugerido}
              placeholder="treino-domingo-parque"
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Data e hora</span>
            <input
              type="datetime-local"
              name="startsAt"
              required
              defaultValue={startsAt ?? ""}
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Local</span>
            <input
              name="local"
              defaultValue={local ?? ""}
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">
              Capacidade (vazio = sem limite)
            </span>
            <input
              name="capacidade"
              type="number"
              min={1}
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
          <CampoDuracao defaultValue={duracaoMin ?? ""} />
        </div>
        <CampoModoRota />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="gratuito" defaultChecked />
          Gratuito
        </label>
        <button
          type="submit"
          className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
        >
          Criar evento
        </button>
      </form>
    </>
  );
}
