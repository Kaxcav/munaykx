import { PrismaClient } from "@prisma/client";

/**
 * Seed de demonstração — mesmos dados ilustrativos da Vitrine.
 * IMPORTANTE (jurídico/edital): nenhum parceiro real aqui. Tudo `demo: true`.
 */
const prisma = new PrismaClient();

const COMUNIDADES = [
  {
    slug: "run-club-matinal-asa-sul",
    nome: "Run club matinal",
    modalidade: "Corrida",
    regiao: "Asa Sul",
    descricao:
      "Grupo de corrida que se encontra antes do sol esquentar. Ritmo livre, ninguém fica pra trás.",
    horarios: "TER · QUI 06H15",
    local: "Parque da Cidade",
    nivel: "Todos os ritmos",
  },
  {
    slug: "jiu-jitsu-noroeste",
    nome: "Jiu-jítsu",
    modalidade: "Jiu-jítsu",
    regiao: "Noroeste",
    descricao:
      "Tatame aberto no fim do dia. Treino técnico e rola leve, com atenção especial a quem está começando.",
    horarios: "SEG–SEX 19H",
    local: "Tatame aberto",
    nivel: "Iniciantes bem-vindos",
  },
  {
    slug: "yoga-ao-ar-livre-asa-norte",
    nome: "Yoga ao ar livre",
    modalidade: "Yoga",
    regiao: "Asa Norte",
    descricao:
      "Prática de sábado de manhã no parque. Leve seu tapete e chegue dez minutos antes.",
    horarios: "SÁB 08H",
    local: "Parque Olhos D'Água",
    nivel: "Leve seu tapete",
  },
  {
    slug: "funcional-sudoeste",
    nome: "Funcional",
    modalidade: "Funcional",
    regiao: "Sudoeste",
    descricao:
      "Circuito funcional em grupo, três vezes por semana, antes do trabalho. Intensidade ajustável.",
    horarios: "SEG · QUA · SEX 06H30",
    local: "Praça central do Sudoeste",
    nivel: "Em grupo",
  },
  {
    slug: "volei-de-areia-lago-sul",
    nome: "Vôlei de areia",
    modalidade: "Vôlei",
    regiao: "Lago Sul",
    descricao:
      "Jogo aberto de domingo nas quadras de areia. Chegou, entrou no rodízio.",
    horarios: "DOM 09H",
    local: "Quadras de areia",
    nivel: "Jogo aberto",
  },
  {
    slug: "pedal-de-domingo-plano-piloto",
    nome: "Pedal de domingo",
    modalidade: "Ciclismo",
    regiao: "Plano Piloto",
    descricao:
      "Pedal de ritmo passeio pelo Eixão do Lazer. Percurso plano, parada pra café no meio.",
    horarios: "DOM 07H",
    local: "Eixão do Lazer",
    nivel: "Ritmo passeio",
  },
];

function diasNoFuturo(dias: number, hora: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, 0, 0, 0);
  return d;
}

async function main() {
  for (const c of COMUNIDADES) {
    await prisma.community.upsert({
      where: { slug: c.slug },
      update: { ...c, demo: true, ativo: true },
      create: { ...c, demo: true, ativo: true },
    });
  }

  const jiuJitsu = await prisma.community.findUniqueOrThrow({
    where: { slug: "jiu-jitsu-noroeste" },
  });
  const pedal = await prisma.community.findUniqueOrThrow({
    where: { slug: "pedal-de-domingo-plano-piloto" },
  });

  const EVENTOS = [
    {
      slug: "aulao-aberto-jiu-jitsu",
      titulo: "Aulão aberto de jiu-jítsu",
      communityId: jiuJitsu.id,
      startsAt: diasNoFuturo(10, 19),
      local: "Tatame aberto — Noroeste",
      capacidade: 40,
      gratuito: true,
    },
    {
      slug: "pedal-especial-eixao",
      titulo: "Pedal especial do Eixão",
      communityId: pedal.id,
      startsAt: diasNoFuturo(14, 7),
      local: "Eixão do Lazer — ponto de encontro na 108 Sul",
      capacidade: null,
      gratuito: true,
    },
  ];

  for (const e of EVENTOS) {
    await prisma.event.upsert({
      where: { slug: e.slug },
      update: { ...e, demo: true, ativo: true },
      create: { ...e, demo: true, ativo: true },
    });
  }

  console.log(
    `Seed ok: ${COMUNIDADES.length} comunidades demo + ${EVENTOS.length} eventos demo.`,
  );
}

main()
  .catch((e) => {
    console.error("Seed falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
