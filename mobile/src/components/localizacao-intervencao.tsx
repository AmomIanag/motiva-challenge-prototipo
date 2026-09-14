import { useState } from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";

import { Botao } from "@/components/botao";
import { CampoDetalhe } from "@/components/campo-detalhe";
import { Cartao } from "@/components/cartao";
import { espacamento, tipografia, useTema } from "@/theme/tema";
import type { Intervencao } from "@/types/intervencao";
import {
  formatarCoordenadas,
  obterCoordenadasValidas,
  textoLocalizacao,
} from "@/utils/localizacao";

interface PropriedadesLocalizacaoIntervencao {
  aoVisualizarMapa?: () => void;
  intervencao: Intervencao;
}

export function LocalizacaoIntervencao({
  aoVisualizarMapa,
  intervencao,
}: PropriedadesLocalizacaoIntervencao) {
  const tema = useTema();
  const [erroExterno, setErroExterno] = useState("");
  const coordenadas = obterCoordenadasValidas(intervencao);
  const campos = [
    ["Rodovia", textoLocalizacao(intervencao.rodovia)],
    ["Km", textoLocalizacao(intervencao.km)],
    ["Sentido", textoLocalizacao(intervencao.sentido)],
    ["Trecho", textoLocalizacao(intervencao.trecho)],
  ].filter((campo): campo is [string, string] => campo[1] !== null);
  const possuiLocalizacao = campos.length > 0 || coordenadas !== null;

  async function abrirEmAplicativoExterno() {
    if (!coordenadas) return;

    setErroExterno("");
    const ponto = `${coordenadas.latitude},${coordenadas.longitude}`;
    const identificacao = encodeURIComponent(`Intervenção #${intervencao.id}`);
    const urlNativa = Platform.select({
      android: `geo:0,0?q=${ponto}(${identificacao})`,
      ios: `maps:0,0?q=${identificacao}&ll=${ponto}`,
    });
    const urlAlternativa = `https://www.openstreetmap.org/?mlat=${coordenadas.latitude}&mlon=${coordenadas.longitude}#map=17/${coordenadas.latitude}/${coordenadas.longitude}`;

    try {
      const podeAbrirNativa = urlNativa ? await Linking.canOpenURL(urlNativa) : false;
      await Linking.openURL(podeAbrirNativa && urlNativa ? urlNativa : urlAlternativa);
    } catch {
      setErroExterno("Não foi possível abrir um aplicativo de mapas neste dispositivo.");
    }
  }

  return (
    <Cartao>
      <View style={styles.cabecalho}>
        <Text style={[styles.sobretitulo, { color: tema.cores.primaria }]}>LOCALIZAÇÃO</Text>
        <Text accessibilityRole="header" style={[styles.titulo, { color: tema.cores.texto }]}>Localização operacional</Text>
      </View>

      {!possuiLocalizacao ? (
        <Text style={[styles.estadoVazio, { color: tema.cores.textoSecundario }]}>Localização operacional não cadastrada.</Text>
      ) : (
        <View accessibilityLabel="Dados da localização da intervenção">
          {campos.map(([rotulo, valor]) => (
            <CampoDetalhe key={rotulo} rotulo={rotulo} valor={rotulo === "Km" ? `Km ${valor}` : valor} />
          ))}
          {coordenadas ? (
            <CampoDetalhe rotulo="Coordenadas" valor={formatarCoordenadas(coordenadas)} />
          ) : null}
        </View>
      )}

      {coordenadas ? (
        <View style={styles.acoes}>
          {aoVisualizarMapa ? (
            <Botao aoPressionar={aoVisualizarMapa} rotulo="Visualizar mapa" />
          ) : null}
          <Botao
            aoPressionar={() => void abrirEmAplicativoExterno()}
            rotulo="Abrir em aplicativo de mapas"
            variante="secundario"
          />
        </View>
      ) : null}

      {erroExterno ? (
        <Text accessibilityLiveRegion="assertive" style={[styles.erro, { color: tema.cores.perigo }]}>
          {erroExterno}
        </Text>
      ) : null}
    </Cartao>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    gap: espacamento.xs,
    marginBottom: espacamento.sm,
  },
  sobretitulo: {
    fontSize: tipografia.pequena,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  titulo: {
    fontSize: tipografia.subtitulo,
    fontWeight: "800",
  },
  estadoVazio: {
    fontSize: tipografia.corpo,
    fontWeight: "600",
    lineHeight: 23,
    paddingVertical: espacamento.sm,
  },
  acoes: {
    gap: espacamento.sm,
    marginTop: espacamento.sm,
  },
  erro: {
    fontSize: tipografia.pequena,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center",
  },
});
