import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BuscaIA from "@/components/BuscaIA";
import { Pagina } from "@/components/comum/Pagina";
import { Secao } from "@/components/comum/Secao";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { CardComunidade } from "@/components/comum/CardComunidade";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { buttonVariants } from "@/components/ui/button";
import { getCommunities, getCommunityFacets } from "@/lib/communities";
import { recortesComDado, tituloDoRecorte } from "@/lib/descoberta";
import { iaDisponivel } from "@/lib/ia";

export const metadata: Metadata = {
  title: "Comunidades",
  description:
    "Descubra comunidades esportivas e culturais de Brasília por modalidade e região.",
};

// A listagem depende do banco e dos filtros — nunca pré-renderizar no build.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  modalidade?: string;
  regiao?: string;
  /** `iniciantes=1` liga o filtro "acolhe iniciante". */
  iniciantes?: string;
  /** O que a busca por descrição entendeu — só pra mostrar de volta. */
  ia?: string;
  iaObs?: string;
}>;

function filtroHref(params: {
  modalidade?: string;
  regiao?: string;
  iniciantes?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params.modalidade) qs.set("modalidade", params.modalidade);
  if (params.regiao) qs.set("regiao", params.regiao);
  // Preserva o filtro de iniciantes ao trocar modalidade/região (senão trocar
  // de aba de modalidade jogaria fora a escolha "pra quem tá começando").
  if (params.iniciantes) qs.set("iniciantes", "1");
  const s = qs.toString();
  return s ? `/comunidades?${s}` : "/comunidades";
}

export default async function ComunidadesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { modalidade, regiao, iniciantes, ia, iaObs } = await searchParams;
  const soIniciantes = iniciantes === "1";
  const [comunidades, facets, recortes] = await Promise.all([
    getCommunities({ modalidade, regiao, acolheIniciante: soIniciantes }),
    getCommunityFacets(),
    recortesComDado(),
  ]);

  const temFiltro = Boolean(modalidade || regiao || soIniciantes);

  // O filtro aqui vive em querystring — o Google indexa isso mal e nunca com
  // um título que case com "corrida em Ceilândia". Quando o recorte atual
  // tem página própria em /descobrir, oferecemos o link: vira URL limpa,
  // compartilhável e rastreável.
  const paginaDoRecorte = temFiltro
    ? recortes.find((r) => r.modalidade === modalidade && r.regiao === regiao)
    : undefined;

  return (
    <>
      <Header />
      <Pagina
        eyebrow="Descoberta"
        titulo="Comunidades de Brasília, filtradas do seu jeito."
      >
        {iaDisponivel() && (
          <div className="mt-8 max-w-2xl">
            <BuscaIA
              exemplos={[
                "corrida de manhã em Taguatinga",
                "jiu jitsu perto do centro",
                "algo tranquilo pra começar",
              ]}
            />
          </div>
        )}

        {ia && (
          // Mostrar o que foi entendido é obrigatório, não enfeite: sem isso
          // a pessoa não sabe POR QUE está vendo esses resultados, e não tem
          // como corrigir se a interpretação errou.
          // O lime aqui é o uso CERTO dele (regra 7): um destaque só na
          // dobra, marcando o que o modelo entendeu. Continua sendo a
          // exceção da tela, não a superfície dela.
          <Card className="mt-6 max-w-2xl border-lime/50 bg-lime/10 p-4">
            <p className="text-sm font-semibold">{ia}</p>
            {iaObs && <p className="mt-1 text-sm text-foreground/70">{iaObs}</p>}
            <Link
              href="/comunidades"
              className="mt-2 inline-block text-xs font-medium text-foreground/60 underline underline-offset-4 hover:text-foreground"
            >
              não era isso — limpar
            </Link>
          </Card>
        )}

        <div className="mt-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Modalidade</span>
            <Chip
              href={filtroHref({ regiao, iniciantes: soIniciantes })}
              ativo={!modalidade}
            >
              Todas
            </Chip>
            {facets.modalidades.map((m) => (
              <Chip
                key={m}
                href={filtroHref({ modalidade: m, regiao, iniciantes: soIniciantes })}
                ativo={modalidade === m}
              >
                {m}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Região</span>
            <Chip
              href={filtroHref({ modalidade, iniciantes: soIniciantes })}
              ativo={!regiao}
            >
              Todas
            </Chip>
            {facets.regioes.map((r) => (
              <Chip
                key={r}
                href={filtroHref({ modalidade, regiao: r, iniciantes: soIniciantes })}
                ativo={regiao === r}
              >
                {r}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Pra quem tá começando</span>
            {/* `aria-pressed` aqui é correto e nos outros chips não seria:
                este é o único que LIGA e DESLIGA a mesma coisa. */}
            <Chip
              href={filtroHref({ modalidade, regiao, iniciantes: !soIniciantes })}
              ativo={soIniciantes}
              aria-pressed={soIniciantes}
            >
              <span aria-hidden>🌱</span>
              Só as que acolhem iniciantes
            </Chip>
          </div>
        </div>

        {comunidades.length === 0 ? (
          <EstadoVazio
            titulo="Nada por aqui com esse recorte — ainda."
            descricao={
              <>
                Brasília é grande e a MUNAY está mapeando comunidade por
                comunidade. Tira um filtro pra ampliar a busca, ou{" "}
                <Link href="/#cadastro" className="underline underline-offset-4">
                  entra na lista de espera
                </Link>{" "}
                que a gente avisa quando algo abrir na sua região.
              </>
            }
            acao={
              temFiltro && (
                <Link href="/comunidades" className={buttonVariants({ size: "sm" })}>
                  Limpar filtros
                </Link>
              )
            }
          />
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {comunidades.map((c) => (
              <CardComunidade
                key={c.id}
                slug={c.slug}
                nome={c.nome}
                regiao={c.regiao}
                modalidade={c.modalidade}
                nivel={c.nivel}
                horarios={c.horarios}
                local={c.local}
                acolheIniciante={c.acolheIniciante}
              />
            ))}
          </div>
        )}

        {paginaDoRecorte && (
          <p className="mt-10">
            <Link
              href={`/descobrir/${paginaDoRecorte.slug}`}
              className="text-sm font-semibold underline underline-offset-4 hover:text-petroleo/70"
            >
              Ver a página de {tituloDoRecorte(paginaDoRecorte).toLowerCase()} →
            </Link>
          </p>
        )}

        {recortes.length > 0 && (
          <Secao titulo="Buscas frequentes" regua>
            <div className="flex flex-wrap gap-2">
              {recortes.map((r) => (
                <Chip key={r.slug} href={`/descobrir/${r.slug}`}>
                  {tituloDoRecorte(r)}
                </Chip>
              ))}
            </div>
          </Secao>
        )}

        <p className="mt-10 font-mono text-xs text-foreground/45">
          * Comunidades marcadas como exemplo são ilustrativas. As parceiras
          reais serão anunciadas no lançamento.
        </p>
      </Pagina>
      <Footer />
    </>
  );
}
