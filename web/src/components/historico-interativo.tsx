"use client";

import { useMemo, useState } from "react";

import { CabecalhoPaginaDados } from "@/components/cabecalho-pagina-dados";
import { FiltrosLeiturasForm } from "@/components/filtros-leituras-form";
import { HistoricoLeituras } from "@/components/historico-leituras";
import { useGerenciamentoHistorico } from "@/hooks/use-gerenciamento-historico";
import { useLeiturasAtualizaveis } from "@/hooks/use-leituras-atualizaveis";
import {
  FILTROS_PADRAO,
  filtrarLeituras,
  filtrosEstaoAtivos,
  TODOS_DISPOSITIVOS,
  type FiltrosLeituras,
} from "@/lib/filtros-leituras";
import type { LeituraVegetacao } from "@/types/leitura";

interface PropriedadesHistoricoInterativo {
  leiturasIniciais: LeituraVegetacao[];
  sincronizadoEmInicial: string | null;
  erroInicial: string | null;
}

export function HistoricoInterativo({
  leiturasIniciais,
  sincronizadoEmInicial,
  erroInicial,
}: PropriedadesHistoricoInterativo) {
  const [filtros, setFiltros] = useState<FiltrosLeituras>(FILTROS_PADRAO);
  const {
    atualizando,
    atualizarLeituras,
    cargaInicialFalhou,
    erroAtualizacao,
    leituras,
    setLeituras,
    sincronizadoEm,
  } = useLeiturasAtualizaveis({
    leiturasIniciais,
    sincronizadoEmInicial,
    erroInicial,
    aoAtualizar: (leiturasAtualizadas) => {
      const dispositivosAtualizados = new Set(
        leiturasAtualizadas.map((leitura) => leitura.dispositivoId),
      );

      setFiltros((filtrosAtuais) =>
        filtrosAtuais.dispositivoId === TODOS_DISPOSITIVOS ||
        dispositivosAtualizados.has(filtrosAtuais.dispositivoId)
          ? filtrosAtuais
          : { ...filtrosAtuais, dispositivoId: TODOS_DISPOSITIVOS },
      );
    },
  });
  const leiturasFiltradas = useMemo(
    () => filtrarLeituras(leituras, filtros),
    [leituras, filtros],
  );
  const dispositivos = useMemo(() => {
    const identificadores = new Set(
      leituras.map((leitura) => leitura.dispositivoId),
    );

    if (filtros.dispositivoId !== TODOS_DISPOSITIVOS) {
      identificadores.add(filtros.dispositivoId);
    }

    return [...identificadores].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [leituras, filtros.dispositivoId]);
  const filtrosAtivos = filtrosEstaoAtivos(filtros);
  const { excluirLeitura, limparHistorico } = useGerenciamentoHistorico({
    setLeituras,
    aoLimparHistorico: () => setFiltros(FILTROS_PADRAO),
  });

  function limparFiltros() {
    setFiltros(FILTROS_PADRAO);
  }

  return (
    <div className="dashboard-interativo historico-interativo" aria-busy={atualizando}>
      <CabecalhoPaginaDados
        rotulo="Consulta e gerenciamento"
        titulo="Histórico"
        descricao="Consulte e gerencie as leituras registradas pela plataforma."
        sincronizadoEm={sincronizadoEm}
        atualizando={atualizando}
        aoAtualizar={atualizarLeituras}
      />

      {cargaInicialFalhou ? (
        <section className="estado-dashboard estado-erro" role="alert">
          <span className="estado-icone" aria-hidden="true">!</span>
          <h2>Não foi possível carregar o histórico</h2>
          <p>Confirme se o backend está disponível e tente novamente.</p>
          <button
            type="button"
            className="botao-tentar-novamente"
            disabled={atualizando}
            onClick={atualizarLeituras}
          >
            {atualizando ? "Tentando novamente…" : "Tentar novamente"}
          </button>
        </section>
      ) : (
        <>
          {erroAtualizacao ? (
            <div className="aviso-atualizacao" role="alert">
              <div>
                <strong>{erroAtualizacao}</strong>
                <span>Os últimos dados carregados continuam sendo exibidos.</span>
              </div>
              <button type="button" disabled={atualizando} onClick={atualizarLeituras}>
                Tentar novamente
              </button>
            </div>
          ) : null}

          <section className="painel painel-filtros-historico" aria-labelledby="titulo-consulta-historico">
            <div className="painel-cabecalho cabecalho-consulta-historico">
              <div>
                <span className="rotulo-secao">Consulta detalhada</span>
                <h2 id="titulo-consulta-historico">Filtrar leituras</h2>
                <p className="subtitulo-painel">Combine os critérios para localizar registros específicos.</p>
              </div>
              <span className="contador-registros" aria-live="polite">
                {filtrosAtivos
                  ? `${leiturasFiltradas.length} de ${leituras.length} leituras`
                  : `${leituras.length} ${leituras.length === 1 ? "leitura" : "leituras"}`}
              </span>
            </div>

            <FiltrosLeiturasForm
              dispositivos={dispositivos}
              filtros={filtros}
              filtrosAtivos={filtrosAtivos}
              aoAlterarFiltros={setFiltros}
              aoLimparFiltros={limparFiltros}
            />
          </section>

          <HistoricoLeituras
            leituras={leiturasFiltradas}
            totalLeituras={leituras.length}
            filtrosAtivos={filtrosAtivos}
            aoLimparFiltros={limparFiltros}
            aoExcluirLeitura={excluirLeitura}
            aoLimparHistorico={limparHistorico}
          />
        </>
      )}
    </div>
  );
}
