import { StyleSheet, Text, View } from "react-native";

import { espacamento, tipografia, useTema } from "@/theme/tema";

interface PropriedadesCampoDetalhe {
  rotulo: string;
  valor: string;
}

export function CampoDetalhe({ rotulo, valor }: PropriedadesCampoDetalhe) {
  const tema = useTema();

  return (
    <View style={[styles.campo, { borderBottomColor: tema.cores.borda }]}>
      <Text style={[styles.rotulo, { color: tema.cores.textoSecundario }]}>{rotulo}</Text>
      <Text selectable style={[styles.valor, { color: tema.cores.texto }]}>
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: espacamento.xs,
    paddingVertical: espacamento.md,
  },
  rotulo: {
    fontSize: tipografia.pequena,
    fontWeight: "700",
  },
  valor: {
    flexShrink: 1,
    fontSize: tipografia.corpo,
    fontWeight: "600",
    lineHeight: 23,
  },
});
