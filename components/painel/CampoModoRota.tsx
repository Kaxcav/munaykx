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
    <details open={modoRota} className="rounded-xl border border-petroleo/15 bg-areia/40 p-5">
      <summary className="cursor-pointer font-display text-lg font-bold">
        Modo rota — pedal, corrida, trilha
      </summary>
      <div className="mt-4 space-y-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="modoRota" defaultChecked={modoRota} />
          Este evento é um trajeto (tem saída e chegada, não um local só)
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Saída</span>
            <input
              name="origem"
              defaultValue={origem}
              maxLength={200}
              placeholder="Ex.: portão do Parque da Cidade"
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Chegada</span>
            <input
              name="destino"
              defaultValue={destino}
              maxLength={200}
              placeholder="Ex.: Torre de TV"
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">
            Sobre o percurso <span className="font-normal text-petroleo/60">(opcional)</span>
          </span>
          <input
            name="percursoObs"
            defaultValue={percursoObs}
            maxLength={280}
            placeholder="Ex.: ~8 km pela orla, ritmo leve, tem parada de água"
            className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
          />
        </label>
        <p className="text-xs text-petroleo/80">
          Só a descrição em texto: a MUNAY mostra saída e chegada, nunca um ponto
          exato no mapa. Ao ligar o modo rota, o campo &ldquo;Local&rdquo; acima é
          ignorado.
        </p>
      </div>
    </details>
  );
}
