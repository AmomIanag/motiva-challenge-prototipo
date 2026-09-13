"use client";

import { useEffect, useRef, useState } from "react";

import { salvarLocalizacaoDispositivoAcao } from "@/app/acoes-dispositivos";
import type {
  DadosLocalizacaoDispositivo,
  Dispositivo,
  OrigemLocalizacao,
} from "@/types/dispositivo";

interface PropriedadesConfiguracaoLocalizacao {
  dispositivosIniciais: Dispositivo[];
  erroInicial: string | null;
  aoDispositivoAtualizado?: (dispositivo: Dispositivo) => void;
}

interface CamposFormulario {
  rodovia: string;
  km: string;
  sentido: string;
  trecho: string;
  latitude: string;
  longitude: string;
  origemLocalizacao: OrigemLocalizacao | null;
}

function camposDoDispositivo(dispositivo: Dispositivo): CamposFormulario {
  return {
    rodovia: dispositivo.rodovia ?? "",
    km: dispositivo.km ?? "",
    sentido: dispositivo.sentido ?? "",
    trecho: dispositivo.trecho ?? "",
    latitude: dispositivo.latitude?.toString() ?? "",
    longitude: dispositivo.longitude?.toString() ?? "",
    origemLocalizacao: dispositivo.origemLocalizacao,
  };
}

function converterCoordenada(valor: string): number | null {
  const normalizado = valor.trim().replace(",", ".");
  return normalizado ? Number(normalizado) : null;
}

function formatarAtualizacao(valor: string | null): string {
  if (!valor) {
    return "Localização ainda não configurada";
  }

  return `Atualizada em ${new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor))}`;
}

export function ConfiguracaoLocalizacao({
  dispositivosIniciais,
  erroInicial,
  aoDispositivoAtualizado,
}: PropriedadesConfiguracaoLocalizacao) {
  const [dispositivos, setDispositivos] = useState(dispositivosIniciais);
  const [dispositivoId, setDispositivoId] = useState(
    dispositivosIniciais[0]?.dispositivoId ?? "",
  );
  const [campos, setCampos] = useState<CamposFormulario | null>(
    dispositivosIniciais[0] ? camposDoDispositivo(dispositivosIniciais[0]) : null,
  );
  const [alterado, setAlterado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [obtendoLocalizacao, setObtendoLocalizacao] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(erroInicial);
  const salvamentoEmAndamento = useRef(false);

  const dispositivoSelecionado = dispositivos.find(
    (dispositivo) => dispositivo.dispositivoId === dispositivoId,
  );

  useEffect(() => {
    const avisarAntesDeSair = (evento: BeforeUnloadEvent) => {
      if (alterado) {
        evento.preventDefault();
      }
    };
    window.addEventListener("beforeunload", avisarAntesDeSair);
    return () => window.removeEventListener("beforeunload", avisarAntesDeSair);
  }, [alterado]);

  function alterarCampo(campo: keyof CamposFormulario, valor: string) {
    setCampos((atuais) => {
      if (!atuais) return atuais;
      return {
        ...atuais,
        [campo]: valor,
        ...(campo === "latitude" || campo === "longitude"
          ? { origemLocalizacao: "manual" as const }
          : {}),
      };
    });
    setAlterado(true);
    setMensagem(null);
    setErro(null);
  }

  function selecionarDispositivo(novoDispositivoId: string) {
    if (
      alterado &&
      !window.confirm(
        "Há alterações não salvas. Deseja descartá-las e trocar de dispositivo?",
      )
    ) {
      return;
    }

    const novoDispositivo = dispositivos.find(
      (dispositivo) => dispositivo.dispositivoId === novoDispositivoId,
    );
    if (!novoDispositivo) return;

    setDispositivoId(novoDispositivoId);
    setCampos(camposDoDispositivo(novoDispositivo));
    setAlterado(false);
    setMensagem(null);
    setErro(null);
  }

  function usarLocalizacaoNavegador() {
    setMensagem(null);
    setErro(null);

    if (!("geolocation" in navigator)) {
      setErro("Este navegador não oferece suporte à geolocalização.");
      return;
    }

    const acessoLocal = ["localhost", "127.0.0.1"].includes(
      window.location.hostname,
    );
    if (!window.isSecureContext && !acessoLocal) {
      setErro(
        "A geolocalização requer uma conexão segura (HTTPS) ou acesso por localhost.",
      );
      return;
    }

    setObtendoLocalizacao(true);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setCampos((atuais) =>
          atuais
            ? {
                ...atuais,
                latitude: posicao.coords.latitude.toFixed(6),
                longitude: posicao.coords.longitude.toFixed(6),
                origemLocalizacao: "navegador",
              }
            : atuais,
        );
        setAlterado(true);
        setObtendoLocalizacao(false);
        setMensagem(
          "Coordenadas preenchidas pelo navegador. Revise e salve para persistir.",
        );
      },
      (falha) => {
        const mensagens: Record<number, string> = {
          [falha.PERMISSION_DENIED]:
            "Permissão de localização negada. Você pode informar as coordenadas manualmente.",
          [falha.POSITION_UNAVAILABLE]:
            "Não foi possível determinar sua localização neste momento.",
          [falha.TIMEOUT]:
            "A obtenção da localização excedeu o tempo limite. Tente novamente.",
        };
        setObtendoLocalizacao(false);
        setErro(mensagens[falha.code] ?? "Não foi possível obter a localização.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
    );
  }

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!campos || !dispositivoId || salvamentoEmAndamento.current) return;

    const latitude = converterCoordenada(campos.latitude);
    const longitude = converterCoordenada(campos.longitude);

    if (
      (campos.latitude.trim() && !Number.isFinite(latitude)) ||
      (campos.longitude.trim() && !Number.isFinite(longitude))
    ) {
      setErro("Latitude e longitude devem ser números válidos.");
      return;
    }
    if ((latitude === null) !== (longitude === null)) {
      setErro("Informe latitude e longitude juntas.");
      return;
    }
    if (latitude !== null && (latitude < -90 || latitude > 90)) {
      setErro("A latitude deve estar entre -90 e 90.");
      return;
    }
    if (longitude !== null && (longitude < -180 || longitude > 180)) {
      setErro("A longitude deve estar entre -180 e 180.");
      return;
    }

    const dados: DadosLocalizacaoDispositivo = {
      rodovia: campos.rodovia.trim() || null,
      km: campos.km.trim() || null,
      sentido: campos.sentido.trim() || null,
      trecho: campos.trecho.trim() || null,
      latitude,
      longitude,
      origemLocalizacao: campos.origemLocalizacao,
    };

    salvamentoEmAndamento.current = true;
    setSalvando(true);
    setMensagem(null);
    setErro(null);

    try {
      const atualizado = await salvarLocalizacaoDispositivoAcao(
        dispositivoId,
        dados,
      );
      setDispositivos((atuais) =>
        atuais.map((dispositivo) =>
          dispositivo.dispositivoId === atualizado.dispositivoId
            ? atualizado
            : dispositivo,
        ),
      );
      setCampos(camposDoDispositivo(atualizado));
      setAlterado(false);
      setMensagem("Localização salva com sucesso.");
      aoDispositivoAtualizado?.(atualizado);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar a localização.",
      );
    } finally {
      salvamentoEmAndamento.current = false;
      setSalvando(false);
    }
  }

  if (erroInicial && dispositivos.length === 0) {
    return (
      <section className="estado-dashboard estado-erro" role="alert">
        <span className="estado-icone" aria-hidden="true">!</span>
        <h2>Não foi possível carregar os dispositivos</h2>
        <p>{erroInicial}</p>
      </section>
    );
  }

  if (dispositivos.length === 0 || !campos) {
    return (
      <section className="estado-dashboard" aria-live="polite">
        <span className="estado-icone" aria-hidden="true">⌖</span>
        <h2>Nenhum dispositivo disponível</h2>
        <p>
          Registre ao menos uma leitura para que o dispositivo possa receber uma
          localização.
        </p>
      </section>
    );
  }

  return (
    <section
      className="painel painel-localizacao"
      id="configuracao-localizacao"
      aria-labelledby="titulo-localizacao"
    >
      <div className="painel-cabecalho cabecalho-localizacao">
        <div>
          <span className="rotulo-secao">Ponto monitorado</span>
          <h2 id="titulo-localizacao">Localização do dispositivo</h2>
          <p>Associe o dispositivo a uma referência operacional e geográfica.</p>
        </div>
        <span className="estado-localizacao">
          {formatarAtualizacao(
            dispositivoSelecionado?.localizacaoAtualizadaEm ?? null,
          )}
        </span>
      </div>

      <form className="formulario-localizacao" onSubmit={salvar}>
        <label className="campo-formulario campo-dispositivo">
          <span>Dispositivo</span>
          <select
            value={dispositivoId}
            onChange={(evento) => selecionarDispositivo(evento.target.value)}
            disabled={salvando}
          >
            {dispositivos.map((dispositivo) => (
              <option key={dispositivo.dispositivoId} value={dispositivo.dispositivoId}>
                {dispositivo.dispositivoId}
              </option>
            ))}
          </select>
        </label>

        <div className="grade-campos-localizacao">
          <label className="campo-formulario">
            <span>Rodovia</span>
            <input
              value={campos.rodovia}
              maxLength={100}
              placeholder="Ex.: BR-101"
              onChange={(evento) => alterarCampo("rodovia", evento.target.value)}
            />
          </label>
          <label className="campo-formulario">
            <span>Km</span>
            <input
              value={campos.km}
              maxLength={50}
              placeholder="Ex.: 204+500"
              onChange={(evento) => alterarCampo("km", evento.target.value)}
            />
          </label>
          <label className="campo-formulario">
            <span>Sentido</span>
            <input
              value={campos.sentido}
              maxLength={100}
              placeholder="Ex.: Norte"
              onChange={(evento) => alterarCampo("sentido", evento.target.value)}
            />
          </label>
          <label className="campo-formulario">
            <span>Trecho</span>
            <input
              value={campos.trecho}
              maxLength={255}
              placeholder="Referência opcional"
              onChange={(evento) => alterarCampo("trecho", evento.target.value)}
            />
          </label>
        </div>

        <div className="divisor-formulario" />

        <div className="topo-coordenadas">
          <div>
            <h3>Coordenadas</h3>
            <p>Preencha manualmente ou use a posição permitida pelo navegador.</p>
          </div>
          <button
            type="button"
            className="botao-geolocalizacao"
            onClick={usarLocalizacaoNavegador}
            disabled={obtendoLocalizacao || salvando}
          >
            <span aria-hidden="true">⌖</span>
            {obtendoLocalizacao ? "Obtendo localização…" : "Usar minha localização"}
          </button>
        </div>

        <div className="grade-coordenadas">
          <label className="campo-formulario">
            <span>Latitude</span>
            <input
              value={campos.latitude}
              inputMode="decimal"
              placeholder="Ex.: -27,595377"
              onChange={(evento) => alterarCampo("latitude", evento.target.value)}
            />
          </label>
          <label className="campo-formulario">
            <span>Longitude</span>
            <input
              value={campos.longitude}
              inputMode="decimal"
              placeholder="Ex.: -48,548050"
              onChange={(evento) => alterarCampo("longitude", evento.target.value)}
            />
          </label>
        </div>

        <div className="rodape-formulario-localizacao">
          <div className="retorno-formulario" aria-live="polite">
            {erro ? <span className="mensagem-formulario erro">{erro}</span> : null}
            {!erro && mensagem ? (
              <span className="mensagem-formulario sucesso">{mensagem}</span>
            ) : null}
            {!erro && !mensagem && campos.origemLocalizacao ? (
              <span>
                Origem das coordenadas: {campos.origemLocalizacao === "navegador"
                  ? "navegador"
                  : "preenchimento manual"}
              </span>
            ) : null}
          </div>
          <button
            type="submit"
            className="botao-salvar-localizacao"
            disabled={salvando || obtendoLocalizacao || !alterado}
          >
            {salvando ? "Salvando…" : "Salvar localização"}
          </button>
        </div>
      </form>
    </section>
  );
}
