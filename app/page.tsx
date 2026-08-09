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
