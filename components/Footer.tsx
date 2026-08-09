import Link from "next/link";
import { type Fundador, linkInstagram, linkWhatsApp } from "@/lib/contato";
import { conteudos } from "@/lib/conteudo";
import { paraFundadorDoFooter } from "@/lib/conteudo/registro";

/**
 * RODAPÉ — briefing 07/08/2026, item 13.
 *
 * "Reestruturar a parte final do site para concentrar contato e informações
 * institucionais." Os três blocos pedidos: canais (13.1), fundadores (13.2)
 * e links institucionais (13.3).
 *
 * ── DUAS COISAS QUE O CÓDIGO FAZ E O BRIEFING NÃO PEDIU EXPLICITAMENTE ───
 *
 * 1. **Canal sem valor não renderiza.** Telefone, WhatsApp e Instagram
 *    ainda não existem em lugar nenhum do projeto (ver `lib/contato.ts`).
 *    Em vez de mostrar `(61) 9xxxx-xxxx`, o bloco some. Quando o Kaxcav
 *    preencher, ele aparece — sem tocar neste arquivo.
 *
 * 2. **Os links institucionais são só os que EXISTEM.** O briefing lista
 *    "Comunidades, Eventos, Experiências esportivas e culturais, Brasília /
 *    DF, Política de Privacidade". Dessas, `/comunidades`, `/mapa` e
 *    `/privacidade` existem. Um índice `/eventos` **não existe e é decisão
 *    de arquitetura**, não esquecimento: o CLAUDE.md registra "evento se
 *    descobre pela comunidade". Um índice `/descobrir` (que cobriria
 *    "experiências esportivas e culturais") está em `docs/IDEIAS.md`, não
 *    começado.
 *
 *    Link institucional apontando pra 404 é pior que link ausente: o Google
 *    rastreia rodapé em toda página do site, então seria erro multiplicado
 *    por página — no domínio que é evidência da Etapa 2. Os dois itens
 *    estão registrados como pendência na STORY-011, não sumidos.
 */

const INSTITUCIONAIS = [
  { href: "/comunidades", rotulo: "Comunidades" },
  { href: "/mapa", rotulo: "Mapa do DF" },
  { href: "/#como-funciona", rotulo: "Como funciona" },
  { href: "/#organizador", rotulo: "Para organizadores" },
  { href: "/privacidade", rotulo: "Política de privacidade" },
] as const;

type CanaisResolvidos = {
  email: string;
  whatsapp: string;
  telefone: string;
  instagram: string;
};

function Canais({ canais }: { canais: CanaisResolvidos }) {
  const { email: EMAIL_CONTATO, ...CANAIS } = canais;
  const whats = linkWhatsApp(CANAIS.whatsapp);
  const linkClasse =
    "text-petroleo/70 transition-colors hover:text-salvia-deep hover:underline underline-offset-4";

  return (
    <ul className="mt-4 space-y-2.5 text-sm">
      <li>
        <a href={`mailto:${EMAIL_CONTATO}`} className={linkClasse}>
          {EMAIL_CONTATO}
        </a>
      </li>
      {CANAIS.telefone && (
        <li>
          <a
            href={`tel:+${CANAIS.whatsapp || CANAIS.telefone.replace(/\D/g, "")}`}
            className={linkClasse}
          >
            {CANAIS.telefone}
          </a>
        </li>
      )}
      {whats && (
        <li>
          <a href={whats} target="_blank" rel="noopener noreferrer" className={linkClasse}>
            WhatsApp →
          </a>
        </li>
      )}
      {CANAIS.instagram && (
        <li>
          <a
            href={linkInstagram(CANAIS.instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasse}
          >
            @{CANAIS.instagram}
          </a>
        </li>
      )}
    </ul>
  );
}

function Fundadores({ lista }: { lista: readonly Fundador[] }) {
  const FUNDADORES = lista;
  if (FUNDADORES.length === 0) return null;

  return (
    <div className="border-t border-petroleo/10 py-10">
      <div className="mx-auto max-w-6xl px-5">
        <p className="eyebrow">Quem está por trás</p>
        <p className="mt-3 max-w-2xl text-petroleo/75">
          A gente também usa a MUNAY — treina, se inscreve e chega sozinho na
          primeira vez, igual a você. Chama a gente, de verdade.
        </p>
        <ul className="mt-6 flex flex-wrap gap-3">
          {FUNDADORES.map((f) => {
            const destino = f.instagram ? linkInstagram(f.instagram) : f.link;
            const miolo = (
              <>
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-salvia font-display text-sm font-bold text-areia"
                >
                  {f.nome.charAt(0)}
                </span>
                <span>
                  <span className="block font-display font-bold">{f.nome}</span>
                  <span className="block text-xs text-petroleo/60">{f.papel}</span>
                </span>
              </>
            );
            const classe =
              "flex items-center gap-3 rounded-full border border-salvia/40 bg-salvia-soft py-2 pl-2 pr-5 transition-colors hover:border-salvia";

            return (
              <li key={f.nome}>
                {destino ? (
                  <a
                    href={destino}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classe}
                  >
                    {miolo}
                  </a>
                ) : (
                  <span className={classe}>{miolo}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/**
 * ONDA 1 do ULTRAPLAN: os canais e os fundadores vêm do conteúdo editável no
 * /admin, com `lib/contato.ts` como padrão de fábrica. Componente assíncrono
 * porque a leitura é de banco — com cache por tag e fallback, então rodapé
 * nunca deixa a página cair (ver `lib/conteudo/index.ts`).
 */
export default async function Footer() {
  const dados = await conteudos([
    "rodape.email",
    "rodape.whatsapp",
    "rodape.telefone",
    "rodape.instagram",
    "rodape.fundadores",
  ] as const);

  const canais: CanaisResolvidos = {
    email: dados["rodape.email"],
    whatsapp: dados["rodape.whatsapp"],
    telefone: dados["rodape.telefone"],
    instagram: dados["rodape.instagram"],
  };
  const fundadores = dados["rodape.fundadores"].map(paraFundadorDoFooter);

  return (
    <footer className="border-t border-petroleo/10 bg-areia">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl font-extrabold tracking-tight">
            MUNAY<span className="text-coral">.</span>
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-petroleo/70">
            Comunidades, eventos e experiências esportivas e culturais de
            Brasília — em um só lugar. Feito aqui, pra quem é daqui.
          </p>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.18em] text-petroleo/45">
            Brasília · Distrito Federal
          </p>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-petroleo/50">
            Fala com a gente
          </p>
          <Canais canais={canais} />
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-petroleo/50">
            Navegar
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {INSTITUCIONAIS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-petroleo/70 transition-colors hover:text-salvia-deep hover:underline underline-offset-4"
                >
                  {l.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Fundadores lista={fundadores} />

      <div className="border-t border-petroleo/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 font-mono text-xs text-petroleo/45">
          <p>© 2026 MUNAY</p>
          <p>Experiências esportivas e culturais · Brasília / DF</p>
        </div>
      </div>
    </footer>
  );
}
