import { Pressable, StyleSheet, Text } from "react-native";

import { raios, tipografia, useTema } from "@/theme/tema";

interface PropriedadesBotao {
  aoPressionar: () => void;
  desabilitado?: boolean;
  rotulo: string;
  variante?: "principal" | "secundario";
}

export function Botao({ aoPressionar, desabilitado = false, rotulo, variante = "principal" }: PropriedadesBotao) {
  const tema = useTema();
  const principal = variante === "principal";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      onPress={aoPressionar}
      style={({ pressed }) => [
        styles.botao,
        {
          backgroundColor: principal ? tema.cores.primaria : tema.cores.superficie,
          borderColor: principal ? tema.cores.primaria : tema.cores.borda,
          opacity: desabilitado ? 0.5 : pressed ? 0.82 : 1,
        },
      ]}
    >
      <Text style={[styles.rotulo, { color: principal ? tema.cores.textoSobrePrimaria : tema.cores.primaria }]}>{rotulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    alignItems: "center",
    borderRadius: raios.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rotulo: {
    fontSize: tipografia.corpo,
    fontWeight: "800",
    textAlign: "center",
  },
});
