import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Botao } from "@/components/botao";
import { CabecalhoAplicativo } from "@/components/cabecalho-aplicativo";
import { Cartao } from "@/components/cartao";
import { Tela } from "@/components/tela";
import { espacamento, tipografia, useTema } from "@/theme/tema";

export default function Servicos() {
  const router = useRouter();
  const tema = useTema();

  return (
    <Tela>
      <CabecalhoAplicativo tituloSecundario="Serviços em campo" />

      <View style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Text style={[styles.sobretitulo, { color: tema.cores.primaria }]}>OPERAÇÃO</Text>
          <Text style={[styles.titulo, { color: tema.cores.texto }]}>Serviços em campo</Text>
          <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>
            As intervenções operacionais serão carregadas da plataforma.
          </Text>
        </View>

        <Cartao>
          <Text style={[styles.tituloCartao, { color: tema.cores.texto }]}>Nenhum dado carregado nesta etapa</Text>
          <Text style={[styles.textoCartao, { color: tema.cores.textoSecundario }]}>
            A integração com os serviços reais será implementada na M2, sem dados simulados.
          </Text>
        </Cartao>

        <Botao rotulo="Voltar ao início" variante="secundario" aoPressionar={() => router.replace("/")} />
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
  descricao: {
    fontSize: tipografia.corpo,
    lineHeight: 25,
  },
  tituloCartao: {
    fontSize: tipografia.subtitulo,
    fontWeight: "700",
  },
  textoCartao: {
    fontSize: tipografia.corpo,
    lineHeight: 23,
  },
});
