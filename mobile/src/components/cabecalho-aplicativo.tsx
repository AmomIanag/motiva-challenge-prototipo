import { StyleSheet, Text, View } from "react-native";

import { espacamento, tipografia, useTema } from "@/theme/tema";

interface PropriedadesCabecalho {
  tituloSecundario?: string;
}

export function CabecalhoAplicativo({ tituloSecundario = "Operação em Campo" }: PropriedadesCabecalho) {
  const tema = useTema();

  return (
    <View accessibilityRole="header" style={styles.cabecalho}>
      <Text style={[styles.marca, { color: tema.cores.primaria }]}>Motiva</Text>
      <Text style={[styles.produto, { color: tema.cores.textoSecundario }]}>{tituloSecundario}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    gap: espacamento.xs,
  },
  marca: {
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  produto: {
    fontSize: tipografia.pequena,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
});
