import { SelectNativo } from "@/components/ui/input";
import { Campo } from "@/components/painel/Campo";

/**
 * Campo de DURAÇÃO do evento (Frente 1). O organizador escolhe duração, não
 * hora de fim — é como as pessoas pensam ("o treino dura 1h"). A escrita compõe
 * `Event.terminaEm = início + duração` (lib/painel.ts).
 *
 * "Não informar" é legítimo (vira `terminaEm` nulo → duração padrão no mapa),
 * então é a primeira opção e o default: obrigar duração seria atrito, e muita
 * comunidade sabe quando começa e não quando termina (mesma razão do `minutoFim`
 * anulável do horário recorrente).
 */
const OPCOES = [
  { valor: "", rotulo: "Não informar" },
  { valor: "30", rotulo: "30 minutos" },
  { valor: "45", rotulo: "45 minutos" },
  { valor: "60", rotulo: "1 hora" },
  { valor: "90", rotulo: "1h30" },
  { valor: "120", rotulo: "2 horas" },
] as const;

/** Os minutos aceitos no select — para o teste bater sem depender do markup. */
export const DURACOES_MIN = OPCOES.filter((o) => o.valor).map((o) => Number(o.valor));

export default function CampoDuracao({ defaultValue = "" }: { defaultValue?: string }) {
  // Se o evento tem uma duração que não está na lista (editada por outra via),
  // acrescenta a opção para não perdê-la silenciosamente ao reeditar.
  const temNaLista = OPCOES.some((o) => o.valor === defaultValue);
  return (
    <Campo
      rotulo="Duração"
      opcional
      dica={
        <>
          Ajuda o mapa a mostrar o que está <em>acontecendo</em> naquele horário —
          não só o que começa.
        </>
      }
    >
      <SelectNativo name="duracaoMin" defaultValue={defaultValue}>
        {OPCOES.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
        {!temNaLista && defaultValue ? (
          <option value={defaultValue}>{defaultValue} minutos</option>
        ) : null}
      </SelectNativo>
    </Campo>
  );
}
