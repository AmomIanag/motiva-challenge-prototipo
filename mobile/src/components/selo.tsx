import { StyleSheet, Text, View } from "react-native";

import { raios, tipografia, useTema } from "@/theme/tema";

type TomSelo = "neutro" | "primario" | "sucesso" | "cuidado" | "perigo";

interface PropriedadesSelo {
  rotulo: string;
  tom?: TomSelo;
}

export function Selo({ rotulo, tom = "neutro" }: PropriedadesSelo) {
  const tema = useTema();
  const cores = {
    neutro: { fundo: tema.cores.superficieSecundaria, texto: tema.cores.textoSecundario },
    primario: { fundo: tema.cores.primariaSuave, texto: tema.cores.primaria },
    sucesso: { fundo: tema.cores.sucessoSuave, texto: tema.cores.sucesso },
    cuidado: { fundo: tema.cores.cuidadoSuave, texto: tema.cores.cuidado },
    perigo: { fundo: tema.cores.perigoSuave, texto: tema.cores.perigo },
  }[tom];

  return (
    <View style={[styles.selo, { backgroundColor: cores.fundo }]}>
      <Text style={[styles.rotulo, { color: cores.texto }]}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    alignSelf: "flex-start",
    borderRadius: raios.arredondado,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  rotulo: {
    fontSize: tipografia.pequena,
    fontWeight: "800",
  },
});
