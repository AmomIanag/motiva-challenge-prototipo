import { StyleSheet, Text, View } from "react-native";

import { Cartao } from "@/components/cartao";
import { Selo } from "@/components/selo";
import { espacamento, tipografia, useTema } from "@/theme/tema";
import type { LeituraVegetacao } from "@/types/leitura";
import { formatarAltura, formatarDataHora } from "@/utils/intervencoes";

interface PropriedadesCartaoLeitura {
  leitura: LeituraVegetacao;
  titulo?: string;
}

const rotulosStatus = {
  seguro: "Seguro",
  cuidado: "Cuidado",
  perigo: "Perigo",
} as const;

export function CartaoLeitura({ leitura, titulo }: PropriedadesCartaoLeitura) {
  const tema = useTema();

  return (
    <Cartao>
      <View style={styles.topo}>
        <View style={styles.identificacao}>
          {titulo ? <Text style={[styles.rotulo, { color: tema.cores.textoSecundario }]}>{titulo}</Text> : null}
          <Text style={[styles.dispositivo, { color: tema.cores.texto }]}>{leitura.dispositivoId}</Text>
        </View>
        <Selo
          rotulo={rotulosStatus[leitura.status]}
          tom={leitura.status === "seguro" ? "sucesso" : leitura.status}
        />
      </View>
      <Text style={[styles.altura, { color: tema.cores.texto }]}>{formatarAltura(leitura.alturaCm)}</Text>
      <Text style={[styles.data, { color: tema.cores.textoSecundario }]}>{formatarDataHora(leitura.medidoEm)}</Text>
    </Cartao>
  );
}

const styles = StyleSheet.create({
  topo: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacamento.sm,
    justifyContent: "space-between",
  },
  identificacao: {
    flexShrink: 1,
    gap: espacamento.xs,
  },
  rotulo: {
    fontSize: tipografia.pequena,
    fontWeight: "700",
  },
  dispositivo: {
    fontSize: tipografia.subtitulo,
    fontWeight: "800",
  },
  altura: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: espacamento.sm,
  },
  data: {
    fontSize: tipografia.pequena,
    fontWeight: "600",
  },
});
