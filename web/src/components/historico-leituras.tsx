"use client";

import { useEffect, useRef, useState } from "react";

import { IndicadorStatus } from "@/components/indicador-status";
import { formatarAltura, formatarData } from "@/lib/formatadores";
import type { LeituraVegetacao } from "@/types/leitura";

interface PropriedadesHistoricoLeituras {
  leituras: LeituraVegetacao[];
  aoExcluirLeitura: (id: string) => Promise<void>;
  aoLimparHistorico: () => Promise<void>;
}

type Confirmacao =
  | { tipo: "leitura"; leitura: LeituraVegetacao }
  | { tipo: "historico" }
  | null;

function IconeLixeira() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" />
    </svg>
  );
}

export function HistoricoLeituras({
  leituras,
  aoExcluirLeitura,
  aoLimparHistorico,
}: PropriedadesHistoricoLeituras) {
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const botaoCancelar = useRef<HTMLButtonElement>(null);
  const leiturasRecentes = [...leituras].reverse();

  useEffect(() => {
    if (!confirmacao) {
      return;
    }

    botaoCancelar.current?.focus();
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !excluindo) {
        setConfirmacao(null);
        setErro(null);
      }
    }

    document.addEventListener("keydown", fecharComEscape);
    return () => document.removeEventListener("keydown", fecharComEscape);
  }, [confirmacao, excluindo]);

  function abrirConfirmacao(proximaConfirmacao: Exclude<Confirmacao, null>) {
    setErro(null);
    setConfirmacao(proximaConfirmacao);
  }

  async function confirmarExclusao() {
    if (!confirmacao) {
      return;
    }

    setExcluindo(true);
    setErro(null);

    try {
      if (confirmacao.tipo === "leitura") {
        await aoExcluirLeitura(confirmacao.leitura.id);
      } else {
        await aoLimparHistorico();
      }
      setConfirmacao(null);
    } catch (erroExclusao) {
      setErro(
        erroExclusao instanceof Error
          ? erroExclusao.message
          : "Não foi possível concluir a exclusão.",
      );
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <section className="painel painel-historico" aria-labelledby="titulo-historico">
      <div className="painel-cabecalho cabecalho-historico">
        <div>
          <span className="rotulo-secao">Registros recentes</span>
          <h2 id="titulo-historico">Histórico de leituras</h2>
        </div>
        <div className="acoes-historico">
          <span className="contador-registros">
            {leituras.length} {leituras.length === 1 ? "registro" : "registros"}
          </span>
          <button
            type="button"
            className="botao-limpar-historico"
            disabled={leituras.length === 0}
            onClick={() => abrirConfirmacao({ tipo: "historico" })}
          >
            <IconeLixeira />
            Limpar histórico
          </button>
        </div>
      </div>

      {leiturasRecentes.length === 0 ? (
        <div className="estado-vazio-historico">
          <strong>Nenhuma leitura registrada.</strong>
          <p>
            Realize uma nova captura com o dispositivo para iniciar o
            monitoramento.
          </p>
        </div>
      ) : (
        <div className="tabela-container">
          <table>
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Dispositivo</th>
                <th>Altura</th>
                <th>Status</th>
                <th className="coluna-acoes"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {leiturasRecentes.map((leitura) => (
                <tr key={leitura.id}>
                  <td><span className="data-leitura">{formatarData(leitura.medidoEm)}</span></td>
                  <td><span className="identificador-dispositivo">{leitura.dispositivoId}</span></td>
                  <td className="altura-leitura">{formatarAltura(leitura.alturaCm)}</td>
                  <td><IndicadorStatus status={leitura.status} compacto /></td>
                  <td className="coluna-acoes">
                    <button
                      type="button"
                      className="botao-excluir-leitura"
                      aria-label={`Excluir leitura de ${formatarData(leitura.medidoEm)}`}
                      title="Excluir leitura"
                      onClick={() => abrirConfirmacao({ tipo: "leitura", leitura })}
                    >
                      <IconeLixeira />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmacao ? (
        <div className="modal-sobreposicao" role="presentation">
          <div
            className="modal-confirmacao"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmacao-exclusao"
            aria-describedby="descricao-confirmacao-exclusao"
          >
            <span className="modal-icone-perigo" aria-hidden="true"><IconeLixeira /></span>
            <h2 id="titulo-confirmacao-exclusao">
              {confirmacao.tipo === "leitura"
                ? "Excluir esta leitura?"
                : "Limpar todo o histórico?"}
            </h2>
            <p id="descricao-confirmacao-exclusao">
              {confirmacao.tipo === "leitura"
                ? "A leitura e suas imagens original e de diagnóstico associadas serão removidas."
                : `${leituras.length} ${leituras.length === 1 ? "leitura será removida" : "leituras serão removidas"}, incluindo suas imagens associadas. Esta ação não poderá ser desfeita.`}
            </p>
            {erro ? <p className="mensagem-erro-exclusao" role="alert">{erro}</p> : null}
            <div className="acoes-modal">
              <button
                ref={botaoCancelar}
                type="button"
                className="botao-secundario"
                disabled={excluindo}
                onClick={() => {
                  setConfirmacao(null);
                  setErro(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="botao-destrutivo"
                disabled={excluindo}
                onClick={confirmarExclusao}
              >
                {excluindo
                  ? "Excluindo..."
                  : confirmacao.tipo === "leitura"
                    ? "Excluir"
                    : "Limpar histórico"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
