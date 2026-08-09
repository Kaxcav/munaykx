import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ComoFunciona from "@/components/ComoFunciona";
import Publicos from "@/components/Publicos";
import Mosaico from "@/components/Mosaico";
import Vitrine from "@/components/Vitrine";
import PainelFuncional from "@/components/PainelFuncional";
import LeadSection from "@/components/LeadSection";
import Footer from "@/components/Footer";

/**
 * ORDEM DAS SEÇÕES — não é arbitrária, veio do briefing de 07/08/2026.
 *
 * O item 3 amarra duas delas explicitamente: "Abaixo da seção de mídia,
 * manter a seção de chamada local: 'Brasília treina todo dia'". Por isso
 * `<Mosaico />` (item 2) vem imediatamente antes de `<Vitrine />` — a prova
 * visual chega primeiro, a lista de comunidades confirma logo em seguida.
 *
 * `<PainelFuncional />` (item 4) entra depois das duas: explicar como a
 * plataforma se divide só faz sentido depois de a pessoa ter visto o que
 * ela tem dentro.
 */
/**
 * ISR de 5 minutos (ULTRAPLAN, Onda 1 — o fix de cache).
 *
 * A home era ESTÁTICA: prerenderizada no build. Duas consequências que
 * pareciam funcionar e não funcionavam:
 *
 *  1. `components/Vitrine.tsx` lê comunidades do banco — então cadastrar uma
 *     comunidade não mudava a home até o próximo deploy. Bug latente, anterior
 *     a esta onda.
 *  2. Com o conteúdo editável, o dono publicaria, veria "publicado com
 *     sucesso" e o site não mudaria. Pior modo de falha possível: parece que
 *     funcionou.
 *
 * O `revalidate` é a rede de baixo (a página se atualiza sozinha em até 5min);
 * o caminho rápido é `revalidateTag`/`revalidatePath` no publicar e na
 * aprovação de comunidade, que refletem NA HORA.
 */
export const revalidate = 300;

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ComoFunciona />
        <Publicos />
        <Mosaico />
        <Vitrine />
        <PainelFuncional />
        <LeadSection />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "MUNAY",
            description:
              "Plataforma de descoberta de comunidades, eventos e experiências esportivas e culturais de Brasília.",
            areaServed: "Brasília, DF, Brasil",
          }),
        }}
      />
    </>
  );
}
