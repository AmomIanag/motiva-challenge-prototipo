import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Botao } from "@/components/botao";
import { CabecalhoAplicativo } from "@/components/cabecalho-aplicativo";
import { LocalizacaoIntervencao } from "@/components/localizacao-intervencao";
import { MapaIntervencao } from "@/components/mapa-intervencao";
import { Selo } from "@/components/selo";
import { Tela } from "@/components/tela";
import { listarIntervencoes } from "@/services/intervencoes";
import { espacamento, raios, tipografia, useTema } from "@/theme/tema";
import type { Intervencao } from "@/types/intervencao";
import { ROTULOS_PRIORIDADE, ROTULOS_STATUS } from "@/utils/intervencoes";
import { obterCoordenadasValidas } from "@/utils/localizacao";

export default function MapaServico() {
  const parametros = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();
  const tema = useTema();
  const id = Array.isArray(parametros.id) ? parametros.id[0] : parametros.id;
  const [intervencao, setIntervencao] = useState<Intervencao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    if (!id) {
      setErro("O identificador da intervenção é inválido.");
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      const encontrada = (await listarIntervencoes()).find((item) => item.id === id);
      if (!encontrada) {
        setErro("Intervenção não encontrada.");
        return;
      }
      setIntervencao(encontrada);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível carregar a intervenção.");
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace(id ? { pathname: "/servicos/[id]", params: { id } } : "/servicos");
  }

  const coordenadas = intervencao ? obterCoordenadasValidas(intervencao) : null;
  const tomStatus =
    intervencao?.status === "concluida"
      ? "sucesso"
      : intervencao?.status === "em_atendimento"
        ? "primario"
        : "cuidado";

  return (
    <Tela>
      <CabecalhoAplicativo tituloSecundario="Mapa do serviço" />

      <View style={styles.conteudo}>
        <Botao aoPressionar={voltar} rotulo="Voltar ao detalhe" variante="secundario" />

        {carregando ? (
          <View accessibilityRole="progressbar" style={styles.carregamento}>
            <ActivityIndicator color={tema.cores.primaria} size="large" />
            <Text style={[styles.texto, { color: tema.cores.textoSecundario }]}>Carregando localização...</Text>
          </View>
        ) : null}

        {erro ? (
          <View accessibilityLiveRegion="assertive" style={[styles.aviso, { backgroundColor: tema.cores.perigoSuave }]}>
            <Text style={[styles.avisoTitulo, { color: tema.cores.perigo }]}>Não foi possível exibir o mapa</Text>
            <Text style={[styles.texto, { color: tema.cores.texto }]}>{erro}</Text>
            <Botao aoPressionar={() => void carregar()} rotulo="Tentar novamente" variante="secundario" />
          </View>
        ) : null}

        {intervencao ? (
          <>
            <View style={styles.cabecalho}>
              <Text style={[styles.sobretitulo, { color: tema.cores.primaria }]}>PONTO DA INTERVENÇÃO</Text>
              <Text accessibilityRole="header" style={[styles.titulo, { color: tema.cores.texto }]}>Intervenção #{intervencao.id}</Text>
              <View style={styles.selos}>
                <Selo rotulo={ROTULOS_PRIORIDADE[intervencao.prioridade]} tom={intervencao.prioridade === "alta" ? "perigo" : "cuidado"} />
                <Selo rotulo={ROTULOS_STATUS[intervencao.status]} tom={tomStatus} />
              </View>
            </View>

            {coordenadas ? (
              <MapaIntervencao coordenadas={coordenadas} intervencaoId={intervencao.id} />
            ) : null}

            <LocalizacaoIntervencao intervencao={intervencao} />
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
    gap: espacamento.sm,
    padding: espacamento.md,
  },
  avisoTitulo: {
    fontSize: tipografia.corpo,
    fontWeight: "800",
  },
  texto: {
    fontSize: tipografia.corpo,
    lineHeight: 23,
  },
});
