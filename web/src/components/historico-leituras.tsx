import { IndicadorStatus } from "@/components/indicador-status";
import { formatarAltura, formatarData } from "@/lib/formatadores";
import type { LeituraVegetacao } from "@/types/leitura";

interface PropriedadesHistoricoLeituras {
  leituras: LeituraVegetacao[];
}

export function HistoricoLeituras({
  leituras,
}: PropriedadesHistoricoLeituras) {
  const leiturasRecentes = [...leituras].reverse();

  return (
    <section className="painel painel-historico" aria-labelledby="titulo-historico">
      <div className="painel-cabecalho">
        <div>
          <span className="rotulo-secao">Registros recentes</span>
          <h2 id="titulo-historico">Histórico de leituras</h2>
        </div>
        <span className="contador-registros">
          {leituras.length} {leituras.length === 1 ? "registro" : "registros"}
        </span>
      </div>

      <div className="tabela-container">
        <table>
          <thead>
            <tr>
              <th>Data e hora</th>
              <th>Dispositivo</th>
              <th>Altura</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leiturasRecentes.map((leitura) => (
              <tr key={`${leitura.dispositivoId}-${leitura.medidoEm}`}>
                <td>
                  <span className="data-leitura">{formatarData(leitura.medidoEm)}</span>
                </td>
                <td>
                  <span className="identificador-dispositivo">
                    {leitura.dispositivoId}
                  </span>
                </td>
                <td className="altura-leitura">{formatarAltura(leitura.alturaCm)}</td>
                <td>
                  <IndicadorStatus status={leitura.status} compacto />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

