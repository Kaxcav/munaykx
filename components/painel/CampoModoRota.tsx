import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Campo, CampoCheck } from "@/components/painel/Campo";

/**
 * MODO ROTA do evento (Frente 1). Pra pedal/corrida/trilha, onde o encontro tem
 * SAÍDA e CHEGADA, não um ponto só. Só TEXTO — origem e destino descritos.
 *
 * ⚠️ NADA DE COORDENADA. Sem lat/lng, sem geojson, sem linha no mapa. Rota exata
 * + horário é rastro (a mesma razão do `HorarioRecorrente` recusar lat/lng), e
 * mapa de rota é Fase 1+, atrás da decisão de privacidade do dono (D6). Aqui a
 * MUNAY mostra "saída X, chegada Y" — a verdade útil sem o rastro.
 *
 * `<details>` nativo (sem JS de cliente): fica recolhido no evento normal e
 * aberto quando já é rota. O checkbox dentro é o que liga de fato — o servidor
 * decide pelo `modoRota`, então funciona mesmo sem JavaScript.
 *
 * O `<details>` continua nativo de propósito na migração: o Collapsible do
 * Radix faria a mesma coisa custando um client component num formulário que é
 * inteiro server action. Trocar seria regressão vestida de modernização.
 */
export default function CampoModoRota({
  modoRota = false,
  origem = "",
  destino = "",
  percursoObs = "",
}: {
  modoRota?: boolean;
  origem?: string;
  destino?: string;
  percursoObs?: string;
}) {
  return (
    <Card className="bg-secondary p-5">
      <details open={modoRota}>
        <summary className="cursor-pointer font-display text-lg font-bold">
          Modo rota — pedal, corrida, trilha
        </summary>
        <div className="mt-4 space-y-4">
          <CampoCheck
            nome="modoRota"
            defaultChecked={modoRota}
            rotulo="Este evento é um trajeto (tem saída e chegada, não um local só)"
            className="font-semibold"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Saída">
              <Input
                name="origem"
                defaultValue={origem}
                maxLength={200}
                placeholder="Ex.: portão do Parque da Cidade"
              />
            </Campo>
            <Campo rotulo="Chegada">
              <Input
                name="destino"
                defaultValue={destino}
                maxLength={200}
                placeholder="Ex.: Torre de TV"
              />
            </Campo>
          </div>
          <Campo
            rotulo="Sobre o percurso"
            opcional
            dica={
              <>
                Só a descrição em texto: a MUNAY mostra saída e chegada, nunca um
                ponto exato no mapa. Ao ligar o modo rota, o campo
                &ldquo;Local&rdquo; acima é ignorado.
              </>
            }
          >
            <Input
              name="percursoObs"
              defaultValue={percursoObs}
              maxLength={280}
              placeholder="Ex.: ~8 km pela orla, ritmo leve, tem parada de água"
            />
          </Campo>
        </div>
      </details>
    </Card>
  );
}
