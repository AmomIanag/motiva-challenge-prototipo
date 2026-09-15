import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { resolverUrlApi } from "@/lib/configuracao-api";
import { espacamento, raios, tipografia, useTema } from "@/theme/tema";
import type { LeituraVegetacao } from "@/types/leitura";

interface PropriedadesImagemLeitura {
  leitura: LeituraVegetacao;
}

export function ImagemLeitura({ leitura }: PropriedadesImagemLeitura) {
  const tema = useTema();
  const [carregando, setCarregando] = useState(Boolean(leitura.imagemUrl));
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    setCarregando(Boolean(leitura.imagemUrl));
    setFalhou(false);
  }, [leitura.id, leitura.imagemUrl]);

  if (!leitura.imagemUrl) {
    return <Text style={[styles.mensagem, { color: tema.cores.textoSecundario }]}>Captura não disponível para esta leitura.</Text>;
  }

  if (falhou) {
    return <Text accessibilityLiveRegion="polite" style={[styles.mensagem, { color: tema.cores.textoSecundario }]}>Não foi possível carregar a captura.</Text>;
  }

  return (
    <View style={[styles.moldura, { backgroundColor: tema.cores.superficieSecundaria, borderColor: tema.cores.borda }]}>
      <Image
        accessibilityLabel={`Captura da leitura ${leitura.id} do dispositivo ${leitura.dispositivoId}`}
        onError={() => {
          setCarregando(false);
          setFalhou(true);
        }}
        onLoad={() => setCarregando(false)}
        resizeMode="contain"
        source={{ uri: resolverUrlApi(leitura.imagemUrl) }}
        style={styles.imagem}
      />
      {carregando ? (
        <View accessibilityRole="progressbar" style={styles.carregamento}>
          <ActivityIndicator color={tema.cores.primaria} />
          <Text style={[styles.mensagem, { color: tema.cores.textoSecundario }]}>Carregando captura...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  moldura: {
    aspectRatio: 4 / 3,
    borderRadius: raios.md,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  imagem: {
    height: "100%",
    width: "100%",
  },
  carregamento: {
    alignItems: "center",
    bottom: 0,
    gap: espacamento.sm,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1,
  },
  mensagem: {
    fontSize: tipografia.pequena,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
  },
});
