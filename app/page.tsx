import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ComoFunciona from "@/components/ComoFunciona";
import Publicos from "@/components/Publicos";
import Vitrine from "@/components/Vitrine";
import LeadSection from "@/components/LeadSection";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ComoFunciona />
        <Publicos />
        <Vitrine />
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
