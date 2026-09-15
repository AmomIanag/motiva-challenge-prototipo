import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Botao } from "@/components/botao";
import { Cartao } from "@/components/cartao";
import { Selo } from "@/components/selo";
import { espacamento, tipografia, useTema } from "@/theme/tema";
import { formatarAltura, formatarDataHora } from "@/utils/intervencoes";
import { formatarLocalizacaoOperacional } from "@/utils/localizacao";
import type { AlertaOperacional } from "@/utils/monitoramento";

interface PropriedadesCartaoAlerta {
  alerta: AlertaOperacional;
}

export function CartaoAlerta({ alerta }: PropriedadesCartaoAlerta) {
  const router = useRouter();
  const tema = useTema();
  const critico = alerta.nivel === "critico";
  const localizacao = alerta.dispositivo
    ? formatarLocalizacaoOperacional(alerta.dispositivo)
    : "Localização operacional não cadastrada.";

  return (
    <Cartao>
      <View style={styles.topo}>
        <Selo rotulo={critico ? "Alerta crítico" : "Alerta de atenção"} tom={critico ? "perigo" : "cuidado"} />
        <Text style={[styles.status, { color: critico ? tema.cores.perigo : tema.cores.cuidado }]}>
          {critico ? "Perigo" : "Cuidado"}
        </Text>
      </View>

      <Text style={[styles.dispositivo, { color: tema.cores.texto }]}>{alerta.dispositivoId}</Text>
      <Text style={[styles.altura, { color: tema.cores.texto }]}>{formatarAltura(alerta.leitura.alturaCm)}</Text>
      <Text style={[styles.data, { color: tema.cores.textoSecundario }]}>{formatarDataHora(alerta.leitura.medidoEm)}</Text>

      <View style={[styles.localizacao, { borderColor: tema.cores.borda }]}>
        <Text style={[styles.rotulo, { color: tema.cores.textoSecundario }]}>Localização operacional</Text>
        <Text style={[styles.texto, { color: tema.cores.texto }]}>{localizacao}</Text>
      </View>

      {alerta.intervencao ? (
        <View style={styles.intervencao}>
          <Text style={[styles.intervencaoRegistrada, { color: tema.cores.sucesso }]}>Intervenção registrada</Text>
          <Botao
            aoPressionar={() =>
              router.push({ pathname: "/servicos/[id]", params: { id: alerta.intervencao!.id } })
            }
            rotulo="Ver serviço"
            variante="secundario"
          />
        </View>
      ) : (
        <Text style={[styles.semIntervencao, { color: tema.cores.textoSecundario }]}>Sem intervenção registrada</Text>
      )}
    </Cartao>
  );
}

const styles = StyleSheet.create({
  topo: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacamento.sm,
    justifyContent: "space-between",
  },
  status: {
    fontSize: tipografia.pequena,
    fontWeight: "800",
  },
  dispositivo: {
    fontSize: tipografia.subtitulo,
    fontWeight: "800",
    marginTop: espacamento.sm,
  },
  altura: {
    fontSize: 28,
    fontWeight: "800",
  },
  data: {
    fontSize: tipografia.pequena,
    fontWeight: "600",
  },
  localizacao: {
    borderRadius: 12,
    borderWidth: 1,
    gap: espacamento.xs,
    marginTop: espacamento.sm,
    padding: espacamento.md,
  },
  rotulo: {
    fontSize: tipografia.pequena,
    fontWeight: "700",
  },
  texto: {
    flexShrink: 1,
    fontSize: tipografia.corpo,
    fontWeight: "600",
    lineHeight: 22,
  },
  intervencao: {
    gap: espacamento.sm,
    marginTop: espacamento.sm,
  },
  intervencaoRegistrada: {
    fontSize: tipografia.pequena,
    fontWeight: "800",
  },
  semIntervencao: {
    fontSize: tipografia.pequena,
    fontWeight: "700",
    marginTop: espacamento.sm,
  },
});
