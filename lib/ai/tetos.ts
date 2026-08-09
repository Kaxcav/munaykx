import type { StatusIa } from "@/lib/ai/tipos";

/**
 * TETOS DE CUSTO E CACHE — um balde por FEATURE.
 *
 * A regra que dá nome ao arquivo: **cada feature tem teto próprio**. Um balde
 * compartilhado significa que a busca por descrição, sendo pública e barata de
 * disparar, consumiria a cota do cadastro assistido — e o organizador que está
 * cadastrando a comunidade dele levaria a culpa por um bot que varreu a busca.
 * Baldes separados também deixam o diagnóstico do /admin dizer QUAL feature
 * gastou.
 *
 * MEMÓRIA DO PROCESSO, de propósito. Some quando o Railway reinicia, e isso é
 * aceitável: reinício é raro e quem estava abusando perde o histórico junto.
 * Migrar pra banco só vale quando houver mais de uma instância — aí o teto por
 * IP vazaria entre elas.
 */

export type ConfigTeto = {
  /** Identificador da feature. Aparece no log e no /admin. */
  nome: string;
  /** Chamadas por IP dentro da janela. */
  limiteIp: number;
  /** Tamanho da janela do teto por IP. */
  janelaMs: number;
  /** Teto global do dia — a trava de custo de verdade. */
  limiteDia: number;
  /** Quantas respostas ficam em cache. 0 desliga o cache. */
  tamanhoCache: number;
};

export type Permissao = { ok: true } | { ok: false; motivo: string };

/**
 * Um balde independente: tetos + cache de uma feature.
 *
 * Instanciar (em vez de um singleton com chave) é o que torna o isolamento
 * estrutural: não existe caminho de código onde uma feature leia a cota da
 * outra, porque não existe estrutura compartilhada.
 */
export class Balde {
  private readonly usosPorIp = new Map<string, number[]>();
  private readonly cache = new Map<string, unknown>();
  private usosHoje = { dia: "", total: 0 };

  constructor(private readonly config: ConfigTeto) {}

  private static hoje(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** True quando ESTA chamada pode acontecer. Já contabiliza o uso. */
  podeChamar(ip: string): Permissao {
    const agora = Date.now();

    const dia = Balde.hoje();
    if (this.usosHoje.dia !== dia) this.usosHoje = { dia, total: 0 };
    if (this.usosHoje.total >= this.config.limiteDia) {
      return { ok: false, motivo: "teto diário atingido" };
    }

    const recentes = (this.usosPorIp.get(ip) ?? []).filter(
      (t) => agora - t < this.config.janelaMs,
    );
    if (recentes.length >= this.config.limiteIp) {
      return { ok: false, motivo: "muitas chamadas seguidas" };
    }

    recentes.push(agora);
    this.usosPorIp.set(ip, recentes);
    this.usosHoje.total += 1;

    // Poda preguiçosa: sem isto o Map cresce pra sempre com IP que passou uma
    // vez e nunca mais voltou.
    if (this.usosPorIp.size > 5_000) {
      for (const [k, v] of this.usosPorIp) {
        if (v.every((t) => agora - t >= this.config.janelaMs)) {
          this.usosPorIp.delete(k);
        }
      }
    }

    return { ok: true };
  }

  lerCache<T>(chave: string): T | undefined {
    if (this.config.tamanhoCache === 0) return undefined;
    return this.cache.get(chave) as T | undefined;
  }

  guardarCache<T>(chave: string, valor: T): void {
    if (this.config.tamanhoCache === 0) return;
    this.cache.set(chave, valor);
    if (this.cache.size > this.config.tamanhoCache) {
      // Descarta o mais antigo (Map preserva ordem de inserção).
      this.cache.delete(this.cache.keys().next().value as string);
    }
  }

  usosDeHoje(): number {
    return this.usosHoje.dia === Balde.hoje() ? this.usosHoje.total : 0;
  }

  tetoDia(): number {
    return this.config.limiteDia;
  }

  /** Só para teste: zera o balde entre casos. Não usar em produção. */
  zerar(): void {
    this.usosPorIp.clear();
    this.cache.clear();
    this.usosHoje = { dia: "", total: 0 };
  }
}

/** Monta o diagnóstico do /admin a partir de um balde e um fornecedor. */
export function statusDe(
  balde: Balde,
  fornecedor: { nome: string; modelo: string; disponivel(): boolean },
): StatusIa {
  return {
    ligada: fornecedor.disponivel(),
    fornecedor: fornecedor.nome,
    modelo: fornecedor.modelo,
    usosHoje: balde.usosDeHoje(),
    tetoDia: balde.tetoDia(),
  };
}

/** Normalização usada nas chaves de cache: mesma pergunta = mesma chave. */
export function normalizar(texto: string): string {
  return texto.trim().toLowerCase().replace(/\s+/g, " ");
}
