import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AcaoIntervencao } from "@/components/acao-intervencao";
import { Botao } from "@/components/botao";
import { Cartao } from "@/components/cartao";
import { Selo } from "@/components/selo";
import { espacamento, tipografia, useTema } from "@/theme/tema";
import type { Intervencao } from "@/types/intervencao";
import {
  formatarAltura,
  formatarDataHora,
  formatarLocalizacao,
  ROTULOS_PRIORIDADE,
  ROTULOS_STATUS,
} from "@/utils/intervencoes";

interface PropriedadesCartaoIntervencao {
  intervencao: Intervencao;
  aoAtualizar: (intervencao: Intervencao) => void;
}

export function CartaoIntervencao({ aoAtualizar, intervencao }: PropriedadesCartaoIntervencao) {
  const router = useRouter();
  const tema = useTema();
  const tomStatus =
    intervencao.status === "concluida"
      ? "sucesso"
      : intervencao.status === "em_atendimento"
        ? "primario"
        : "cuidado";

  return (
    <Cartao>
      <View style={styles.selos}>
        <Selo rotulo={ROTULOS_PRIORIDADE[intervencao.prioridade]} tom={intervencao.prioridade === "alta" ? "perigo" : "cuidado"} />
        <Selo rotulo={ROTULOS_STATUS[intervencao.status]} tom={tomStatus} />
      </View>

      <Text style={[styles.titulo, { color: tema.cores.texto }]}>Intervenção #{intervencao.id}</Text>

      <View style={styles.metricas}>
        <View style={[styles.metrica, { backgroundColor: tema.cores.superficieSecundaria }]}>
          <Text style={[styles.rotulo, { color: tema.cores.textoSecundario }]}>Vegetação detectada</Text>
          <Text style={[styles.valor, { color: tema.cores.texto }]}>{formatarAltura(intervencao.alturaCm)}</Text>
        </View>
        <View style={[styles.metrica, { backgroundColor: tema.cores.superficieSecundaria }]}>
          <Text style={[styles.rotulo, { color: tema.cores.textoSecundario }]}>Dispositivo</Text>
          <Text style={[styles.valor, { color: tema.cores.texto }]}>{intervencao.dispositivoId}</Text>
        </View>
      </View>

      <View style={styles.informacao}>
        <Text style={[styles.rotulo, { color: tema.cores.textoSecundario }]}>Detectada em</Text>
        <Text style={[styles.texto, { color: tema.cores.texto }]}>{formatarDataHora(intervencao.medidoEm)}</Text>
      </View>

      <View style={[styles.localizacao, { borderColor: tema.cores.borda }]}>
        <Text style={[styles.rotulo, { color: tema.cores.textoSecundario }]}>Localização operacional</Text>
        <Text style={[styles.texto, { color: tema.cores.texto }]}>{formatarLocalizacao(intervencao)}</Text>
      </View>

      <Botao
        aoPressionar={() => router.push({ pathname: "/servicos/[id]", params: { id: intervencao.id } })}
        rotulo="Ver detalhes"
        variante="secundario"
      />
      <AcaoIntervencao aoAtualizar={aoAtualizar} intervencao={intervencao} />
    </Cartao>
  );
}

const styles = StyleSheet.create({
  selos: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacamento.sm,
    justifyContent: "space-between",
  },
  titulo: {
    fontSize: tipografia.subtitulo,
    fontWeight: "800",
    marginVertical: espacamento.xs,
  },
  metricas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacamento.sm,
  },
  metrica: {
    borderRadius: 12,
    flexBasis: 140,
    flexGrow: 1,
    gap: espacamento.xs,
    minWidth: 0,
    padding: espacamento.md,
  },
  informacao: {
    gap: espacamento.xs,
  },
  localizacao: {
    borderRadius: 12,
    borderWidth: 1,
    gap: espacamento.xs,
    padding: espacamento.md,
  },
  rotulo: {
    fontSize: tipografia.pequena,
    fontWeight: "600",
  },
  valor: {
    fontSize: tipografia.subtitulo,
    fontWeight: "800",
  },
  texto: {
    flexShrink: 1,
    fontSize: tipografia.corpo,
    fontWeight: "600",
    lineHeight: 22,
  },
});
