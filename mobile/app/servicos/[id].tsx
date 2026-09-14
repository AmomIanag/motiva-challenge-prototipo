import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AcaoIntervencao } from "@/components/acao-intervencao";
import { Botao } from "@/components/botao";
import { CabecalhoAplicativo } from "@/components/cabecalho-aplicativo";
import { CampoDetalhe } from "@/components/campo-detalhe";
import { Cartao } from "@/components/cartao";
import { LocalizacaoIntervencao } from "@/components/localizacao-intervencao";
import { Selo } from "@/components/selo";
import { Tela } from "@/components/tela";
import { listarIntervencoes } from "@/services/intervencoes";
import { espacamento, raios, tipografia, useTema } from "@/theme/tema";
import type { Intervencao } from "@/types/intervencao";
import {
  formatarAltura,
  formatarDataHora,
  ROTULOS_PRIORIDADE,
  ROTULOS_STATUS,
} from "@/utils/intervencoes";

const rotulosStatusLeitura = {
  seguro: "Seguro",
  cuidado: "Cuidado",
  perigo: "Perigo",
} as const;

export default function DetalheServico() {
  const parametros = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();
  const tema = useTema();
  const id = Array.isArray(parametros.id) ? parametros.id[0] : parametros.id;
  const [intervencao, setIntervencao] = useState<Intervencao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(
    async (manual = false) => {
      if (!id) {
        setErro("O identificador da intervenção é inválido.");
        setCarregando(false);
        return;
      }

      if (manual) setAtualizando(true);
      else setCarregando(true);
      setErro("");

      try {
        const encontrada = (await listarIntervencoes()).find((item) => item.id === id);
        if (!encontrada) {
          setIntervencao(null);
          setErro("Intervenção não encontrada.");
          return;
        }
        setIntervencao(encontrada);
      } catch (falha) {
        setErro(falha instanceof Error ? falha.message : "Não foi possível carregar a intervenção.");
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace("/servicos");
  }

  return (
    <Tela aoAtualizar={() => void carregar(true)} atualizando={atualizando}>
      <CabecalhoAplicativo tituloSecundario="Detalhe do serviço" />

      <View style={styles.conteudo}>
        <Botao aoPressionar={voltar} rotulo="Voltar aos serviços" variante="secundario" />

        {carregando ? (
          <View accessibilityRole="progressbar" style={styles.carregamento}>
            <ActivityIndicator color={tema.cores.primaria} size="large" />
            <Text style={[styles.texto, { color: tema.cores.textoSecundario }]}>Carregando intervenção...</Text>
          </View>
        ) : null}

        {erro ? (
          <View accessibilityLiveRegion="assertive" style={[styles.aviso, { backgroundColor: tema.cores.perigoSuave }]}>
            <Text style={[styles.avisoTitulo, { color: tema.cores.perigo }]}>
              {intervencao ? "Não foi possível atualizar os dados" : "Não foi possível exibir o serviço"}
            </Text>
            <Text style={[styles.texto, { color: tema.cores.texto }]}>{erro}</Text>
            <Botao aoPressionar={() => void carregar(true)} rotulo="Tentar novamente" variante="secundario" />
          </View>
        ) : null}

        {intervencao ? (
          <>
            <View style={styles.cabecalho}>
              <Text style={[styles.sobretitulo, { color: tema.cores.primaria }]}>SERVIÇO OPERACIONAL</Text>
              <Text accessibilityRole="header" style={[styles.titulo, { color: tema.cores.texto }]}>
                Intervenção #{intervencao.id}
              </Text>
              <View style={styles.selos}>
                <Selo
                  rotulo={ROTULOS_PRIORIDADE[intervencao.prioridade]}
                  tom={intervencao.prioridade === "alta" ? "perigo" : "cuidado"}
                />
                <Selo
                  rotulo={ROTULOS_STATUS[intervencao.status]}
                  tom={intervencao.status === "concluida" ? "sucesso" : intervencao.status === "em_atendimento" ? "primario" : "cuidado"}
                />
              </View>
            </View>

            <Cartao>
              <CampoDetalhe rotulo="Dispositivo" valor={intervencao.dispositivoId} />
              <CampoDetalhe rotulo="Altura detectada" valor={formatarAltura(intervencao.alturaCm)} />
              <CampoDetalhe rotulo="Status da leitura de origem" valor={rotulosStatusLeitura[intervencao.statusLeitura]} />
              <CampoDetalhe rotulo="Data e hora da detecção" valor={formatarDataHora(intervencao.medidoEm)} />
              <CampoDetalhe rotulo="Intervenção criada em" valor={formatarDataHora(intervencao.criadaEm)} />
              <CampoDetalhe rotulo="Atendimento iniciado em" valor={formatarDataHora(intervencao.iniciadaEm)} />
              <CampoDetalhe rotulo="Intervenção concluída em" valor={formatarDataHora(intervencao.concluidaEm)} />
            </Cartao>

            <LocalizacaoIntervencao
              aoVisualizarMapa={() =>
                router.push({ pathname: "/servicos/[id]/mapa", params: { id: intervencao.id } })
              }
              intervencao={intervencao}
            />

            <AcaoIntervencao aoAtualizar={setIntervencao} intervencao={intervencao} />
          </>
        ) : null}
      </View>
    </Tela>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    flex: 1,
    gap: espacamento.lg,
    paddingBottom: espacamento.xl,
  },
  cabecalho: {
    gap: espacamento.sm,
  },
  sobretitulo: {
    fontSize: tipografia.pequena,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  titulo: {
    fontSize: tipografia.titulo,
    fontWeight: "800",
  },
  selos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacamento.sm,
  },
  carregamento: {
    alignItems: "center",
    gap: espacamento.md,
    justifyContent: "center",
    minHeight: 240,
  },
  aviso: {
    borderRadius: raios.md,
    gap: espacamento.md,
    padding: espacamento.md,
  },
  avisoTitulo: {
    fontSize: tipografia.subtitulo,
    fontWeight: "800",
  },
  texto: {
    fontSize: tipografia.corpo,
    lineHeight: 23,
  },
});
