"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { atualizarDispositivosAcao } from "@/app/acoes-dispositivos";
import { CabecalhoPaginaDados } from "@/components/cabecalho-pagina-dados";
import { IndicadorStatus } from "@/components/indicador-status";
import { formatarAltura, formatarData } from "@/lib/formatadores";
import {
  associarDispositivosAsUltimasLeituras,
  coordenadasDispositivoValidas,
  dispositivoPossuiLocalizacao,
} from "@/lib/pontos-monitorados";
import type { Dispositivo } from "@/types/dispositivo";
import type { LeituraVegetacao } from "@/types/leitura";

interface PropriedadesDispositivosOperacionais {
  dispositivosIniciais: Dispositivo[];
  leiturasIniciais: LeituraVegetacao[];
  sincronizadoEmInicial: string | null;
  erroInicial: string | null;
}

function textoOrigemLocalizacao(dispositivo: Dispositivo): string | null {
  if (dispositivo.origemLocalizacao === "navegador") return "Navegador";
  if (dispositivo.origemLocalizacao === "manual") return "Preenchimento manual";
  return null;
}

function LocalizacaoDispositivo({ dispositivo }: { dispositivo: Dispositivo }) {
  const possuiLocalizacao = dispositivoPossuiLocalizacao(dispositivo);
  const origem = textoOrigemLocalizacao(dispositivo);

  if (!possuiLocalizacao) {
    return (
      <section className="localizacao-dispositivo localizacao-dispositivo-ausente">
        <span className="icone-localizacao-dispositivo" aria-hidden="true">⌖</span>
        <div>
          <h3>Localização não cadastrada</h3>
          <p>Adicione uma referência operacional para identificar este ponto.</p>
        </div>
      </section>
    );
  }

  const itens = [
    ["Rodovia", dispositivo.rodovia],
    ["Km", dispositivo.km],
    ["Sentido", dispositivo.sentido],
    ["Trecho", dispositivo.trecho],
    [
      "Coordenadas",
      coordenadasDispositivoValidas(dispositivo)
        ? `${dispositivo.latitude.toFixed(6)}, ${dispositivo.longitude.toFixed(6)}`
        : null,
    ],
    ["Origem", origem],
    [
      "Atualização",
      dispositivo.localizacaoAtualizadaEm
        ? formatarData(dispositivo.localizacaoAtualizadaEm)
        : null,
    ],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <section className="localizacao-dispositivo">
      <div className="titulo-localizacao-dispositivo">
        <span className="icone-localizacao-dispositivo" aria-hidden="true">⌖</span>
        <div>
          <span>Localização configurada</span>
          <h3>{dispositivo.rodovia?.trim() || "Referência operacional"}</h3>
        </div>
      </div>
      <dl>
        {itens.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CardDispositivo({
  dispositivo,
  ultimaLeitura,
}: {
  dispositivo: Dispositivo;
  ultimaLeitura: LeituraVegetacao | null;
}) {
  const possuiLocalizacao = dispositivoPossuiLocalizacao(dispositivo);
  const possuiCoordenadas = coordenadasDispositivoValidas(dispositivo);

  return (
    <article className="card-dispositivo-operacional">
      <header className="topo-card-dispositivo">
        <div>
          <span className="rotulo-dispositivo">Ponto de monitoramento</span>
          <h2>{dispositivo.dispositivoId}</h2>
        </div>
        <span className="estado-registro-dispositivo">
          {ultimaLeitura ? "Com leituras registradas" : "Sem leituras registradas"}
        </span>
      </header>

      {ultimaLeitura ? (
        <section className="ultima-leitura-dispositivo" aria-label="Última leitura do dispositivo">
          <div className="altura-dispositivo">
            <span>Última leitura</span>
            <strong>{formatarAltura(ultimaLeitura.alturaCm)}</strong>
          </div>
          <div className="status-dispositivo">
            <span>Status da vegetação</span>
            <IndicadorStatus status={ultimaLeitura.status} />
          </div>
          <div className="data-leitura-dispositivo">
            <span>Registrada em</span>
            <time dateTime={ultimaLeitura.medidoEm}>
              {formatarData(ultimaLeitura.medidoEm)}
            </time>
          </div>
        </section>
      ) : (
        <section className="sem-leitura-dispositivo" aria-live="polite">
          <span className="estado-icone" aria-hidden="true">◎</span>
          <div>
            <h3>Sem leituras registradas</h3>
            <p>O status da vegetação será exibido após a primeira leitura.</p>
          </div>
        </section>
      )}

      <LocalizacaoDispositivo dispositivo={dispositivo} />

      <div className="acoes-dispositivo-operacional">
        <Link href="/monitoramento">Ver monitoramento</Link>
        {possuiCoordenadas ? <Link href="/mapa">Ver no mapa</Link> : null}
        <Link href="/mapa#configuracao-localizacao">
          {possuiLocalizacao ? "Editar localização" : "Configurar localização"}
        </Link>
      </div>
    </article>
  );
}

export function DispositivosOperacionais({
  dispositivosIniciais,
  leiturasIniciais,
  sincronizadoEmInicial,
  erroInicial,
}: PropriedadesDispositivosOperacionais) {
  const [dispositivos, setDispositivos] = useState(dispositivosIniciais);
  const [leituras, setLeituras] = useState(leiturasIniciais);
  const [sincronizadoEm, setSincronizadoEm] = useState(sincronizadoEmInicial);
  const [erro, setErro] = useState(erroInicial);
  const [atualizando, setAtualizando] = useState(false);
  const atualizacaoEmAndamento = useRef(false);

  const dispositivosComLeitura = useMemo(
    () =>
      associarDispositivosAsUltimasLeituras(dispositivos, leituras).sort(
        (a, b) =>
          a.dispositivo.dispositivoId.localeCompare(
            b.dispositivo.dispositivoId,
            "pt-BR",
            { numeric: true },
          ),
      ),
    [dispositivos, leituras],
  );
  const comLocalizacao = dispositivos.filter(dispositivoPossuiLocalizacao).length;
  const comLeituras = dispositivosComLeitura.filter(
    ({ ultimaLeitura }) => ultimaLeitura !== null,
  ).length;
  const cargaInicialFalhou = sincronizadoEm === null && erro !== null;

  async function atualizarDispositivos() {
    if (atualizacaoEmAndamento.current) return;

    atualizacaoEmAndamento.current = true;
    setAtualizando(true);
    setErro(null);

    try {
      const resultado = await atualizarDispositivosAcao();
      setDispositivos(resultado.dispositivos);
      setLeituras(resultado.leituras);
      setSincronizadoEm(resultado.sincronizadoEm);
    } catch {
      setErro("Não foi possível atualizar os dispositivos. Os dados anteriores continuam visíveis.");
    } finally {
      atualizacaoEmAndamento.current = false;
      setAtualizando(false);
    }
  }

  return (
    <div className="dashboard-interativo dispositivos-operacionais" aria-busy={atualizando}>
      <CabecalhoPaginaDados
        rotulo="Pontos monitorados"
        titulo="Dispositivos"
        descricao="Consulte as leituras e a localização dos pontos conhecidos pela plataforma."
        sincronizadoEm={sincronizadoEm}
        atualizando={atualizando}
        aoAtualizar={atualizarDispositivos}
      />

      {cargaInicialFalhou ? (
        <section className="estado-dashboard estado-erro" role="alert">
          <span className="estado-icone" aria-hidden="true">!</span>
          <h2>Não foi possível carregar os dispositivos</h2>
          <p>Confirme se o backend está disponível e tente novamente.</p>
          <button
            type="button"
            className="botao-tentar-novamente"
            disabled={atualizando}
            onClick={atualizarDispositivos}
          >
            {atualizando ? "Tentando novamente…" : "Tentar novamente"}
          </button>
        </section>
      ) : (
        <>
          {erro ? <div className="aviso-dispositivos" role="alert">{erro}</div> : null}

          <section className="grade-resumo-dispositivos" aria-label="Resumo dos dispositivos">
            <article><span>Dispositivos conhecidos</span><strong>{dispositivos.length}</strong></article>
            <article><span>Com localização</span><strong>{comLocalizacao}</strong></article>
            <article><span>Sem localização</span><strong>{dispositivos.length - comLocalizacao}</strong></article>
            <article><span>Com leituras</span><strong>{comLeituras}</strong></article>
          </section>

          {dispositivosComLeitura.length === 0 ? (
            <section className="estado-dispositivos-vazio" aria-live="polite">
              <span className="estado-icone" aria-hidden="true">◇</span>
              <h2>Nenhum dispositivo conhecido</h2>
              <p>Os dispositivos aparecerão aqui após o registro da primeira leitura.</p>
            </section>
          ) : (
            <section className="lista-dispositivos-operacionais" aria-label="Dispositivos conhecidos">
              {dispositivosComLeitura.map(({ dispositivo, ultimaLeitura }) => (
                <CardDispositivo
                  key={dispositivo.dispositivoId}
                  dispositivo={dispositivo}
                  ultimaLeitura={ultimaLeitura}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
