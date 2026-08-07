import { test, expect } from "@playwright/test";
import {
  ABAS,
  contarPorAba,
  ehAbaValida,
  ehPago,
  pertenceAAba,
  selo,
  situacaoDe,
  type InscricaoClassificavel,
} from "@/lib/inscricoes";
import { acentoDaModalidade, familiaDaModalidade } from "@/lib/modalidades";

/**
 * Classificação das inscrições (STORY-011, item 9 do briefing) e o de-para
 * de cor por modalidade (item 3).
 *
 * A classificação é usada por TRÊS telas (`/minhas-inscricoes`,
 * `/meus-ingressos` e a inferência de consumo). Se ela escorregar, a pessoa
 * vê "2 ativos" numa tela e "1 ativo" na outra — e para de confiar nas duas.
 */

const AGORA = new Date("2026-08-07T12:00:00Z");
const FUTURO = new Date("2026-09-01T09:00:00Z");
const PASSADO = new Date("2026-07-01T09:00:00Z");

function insc(over: Partial<InscricaoClassificavel> & {
  startsAt?: Date;
  gratuito?: boolean;
} = {}): InscricaoClassificavel {
  return {
    canceledAt: over.canceledAt ?? null,
    status: over.status ?? "confirmado",
    event: {
      startsAt: over.startsAt ?? FUTURO,
      gratuito: over.gratuito ?? true,
    },
  };
}

test.describe("situação de uma inscrição", () => {
  test("futuro = ativa, passado = encerrada", () => {
    expect(situacaoDe(insc({ startsAt: FUTURO }), AGORA)).toBe("ativa");
    expect(situacaoDe(insc({ startsAt: PASSADO }), AGORA)).toBe("encerrada");
  });

  test("CANCELADA vence a data — inclusive num evento que já passou", () => {
    // Este é o caso que quebra implementação ingênua: quem cancelou um
    // evento que já aconteceu não "viveu a experiência". Classificar como
    // encerrada colocaria o cancelamento no histórico de participação.
    expect(
      situacaoDe(insc({ startsAt: PASSADO, canceledAt: new Date("2026-06-20") }), AGORA),
    ).toBe("cancelada");
    expect(
      situacaoDe(insc({ startsAt: FUTURO, canceledAt: new Date("2026-08-01") }), AGORA),
    ).toBe("cancelada");
  });

  test("lista de espera continua sendo ativa — só o selo muda", () => {
    const r = insc({ status: "lista_espera" });
    expect(situacaoDe(r, AGORA)).toBe("ativa");
    expect(selo(r, AGORA).rotulo).toBe("Lista de espera");
  });
});

test.describe("as três abas do briefing", () => {
  test("cancelada some de Ativos e aparece em Encerrados", () => {
    const cancelada = insc({ startsAt: FUTURO, canceledAt: new Date("2026-08-01") });
    expect(pertenceAAba(cancelada, "ativos", AGORA)).toBe(false);
    // Precisa continuar visível em algum lugar: a pessoa tem que conseguir
    // provar que cancelou.
    expect(pertenceAAba(cancelada, "encerrados", AGORA)).toBe(true);
  });

  test("Pagos = evento não gratuito e não cancelado", () => {
    expect(ehPago(insc({ gratuito: false }))).toBe(true);
    expect(ehPago(insc({ gratuito: true }))).toBe(false);
    // Cancelou: não é mais uma compra ativa.
    expect(ehPago(insc({ gratuito: false, canceledAt: new Date() }))).toBe(false);
  });

  test("Pagos cruza com as outras abas em vez de excluir", () => {
    // Um evento pago no futuro tem que estar em Ativos E em Pagos. Se as
    // abas fossem mutuamente exclusivas, comprar ingresso faria a inscrição
    // sumir da agenda da pessoa.
    const pagoFuturo = insc({ gratuito: false, startsAt: FUTURO });
    expect(pertenceAAba(pagoFuturo, "ativos", AGORA)).toBe(true);
    expect(pertenceAAba(pagoFuturo, "pagos", AGORA)).toBe(true);
  });

  test("a contagem bate com o que cada aba mostra", () => {
    const lista = [
      insc({ startsAt: FUTURO }),
      insc({ startsAt: FUTURO, status: "lista_espera" }),
      insc({ startsAt: PASSADO }),
      insc({ startsAt: FUTURO, canceledAt: new Date("2026-08-02") }),
      insc({ startsAt: FUTURO, gratuito: false }),
    ];
    const contagem = contarPorAba(lista, AGORA);
    expect(contagem).toEqual({ ativos: 3, encerrados: 2, pagos: 1 });

    // A contagem TEM que ser derivada do mesmo predicado que filtra a lista.
    for (const aba of ABAS) {
      expect(lista.filter((r) => pertenceAAba(r, aba.id, AGORA)).length).toBe(
        contagem[aba.id],
      );
    }
  });

  test("aba inválida na URL não passa", () => {
    expect(ehAbaValida("ativos")).toBe(true);
    expect(ehAbaValida("pagos")).toBe(true);
    expect(ehAbaValida("hackeada")).toBe(false);
    expect(ehAbaValida(undefined)).toBe(false);
  });
});

test.describe("cor por modalidade", () => {
  test("a MESMA modalidade dá sempre o mesmo acento", () => {
    // É o requisito inteiro do item 3: "reconhecimento visual rápido". Cor
    // que muda entre telas não cria reconhecimento, cria ruído.
    expect(acentoDaModalidade("corrida")).toBe(acentoDaModalidade("Corrida"));
    expect(acentoDaModalidade("Vôlei de areia")).toBe(acentoDaModalidade("volei de areia"));
    expect(acentoDaModalidade("Jiu-Jítsu")).toBe(acentoDaModalidade("jiu jitsu"));
  });

  test("famílias diferentes recebem acentos diferentes", () => {
    const yoga = acentoDaModalidade("yoga");
    const luta = acentoDaModalidade("jiu-jítsu");
    const corrida = acentoDaModalidade("corrida");
    expect(new Set([yoga, luta, corrida]).size).toBe(3);
  });

  test("modalidade desconhecida ganha acento estável — não cai tudo no 1", () => {
    const inventadas = ["quadribol", "curling", "parkour urbano", "xadrez ao ar livre"];
    for (const m of inventadas) {
      expect(acentoDaModalidade(m)).toBe(acentoDaModalidade(m));
      expect(acentoDaModalidade(m)).toBeGreaterThanOrEqual(1);
      expect(acentoDaModalidade(m)).toBeLessThanOrEqual(6);
    }
    // E não devolve todas iguais.
    expect(new Set(inventadas.map(acentoDaModalidade)).size).toBeGreaterThan(1);
  });

  test("modalidade vazia não quebra", () => {
    expect(acentoDaModalidade(null)).toBe(1);
    expect(acentoDaModalidade(undefined)).toBe(1);
    expect(acentoDaModalidade("")).toBe(1);
    expect(familiaDaModalidade(null)).toBeNull();
  });
});
