import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Botao } from "@/components/botao";
import { CabecalhoAplicativo } from "@/components/cabecalho-aplicativo";
import { Cartao } from "@/components/cartao";
import { Tela } from "@/components/tela";
import { espacamento, tipografia, useTema } from "@/theme/tema";

export default function Inicio() {
  const router = useRouter();
  const tema = useTema();

  return (
    <Tela>
      <CabecalhoAplicativo />

      <View style={styles.conteudoPrincipal}>
        <View style={styles.apresentacao}>
          <Text style={[styles.sobretitulo, { color: tema.cores.primaria }]}>EQUIPE DE CAMPO</Text>
          <Text style={[styles.titulo, { color: tema.cores.texto }]}>Operação em Campo</Text>
          <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>
            Acompanhe e execute intervenções de vegetação atribuídas à operação.
          </Text>
        </View>

        <View accessibilityLabel="Áreas do aplicativo" style={styles.navegacao}>
          <Botao rotulo="Serviços" aoPressionar={() => router.push("/servicos")} />
          <Botao rotulo="Alertas" variante="secundario" aoPressionar={() => router.push("/alertas")} />
          <Botao rotulo="Monitoramento" variante="secundario" aoPressionar={() => router.push("/monitoramento")} />
        </View>

        <Cartao>
          <Text style={[styles.tituloCartao, { color: tema.cores.texto }]}>Plataforma integrada</Text>
          <Text style={[styles.textoCartao, { color: tema.cores.textoSecundario }]}>
            Este aplicativo é o cliente operacional mobile da plataforma Motiva ESP.
          </Text>
        </Cartao>

        <Botao
          rotulo="Configuração da API"
          variante="secundario"
          aoPressionar={() => router.push("/configuracao")}
        />
      </View>
    </Tela>
  );
}

const styles = StyleSheet.create({
  conteudoPrincipal: {
    flex: 1,
    gap: espacamento.lg,
    justifyContent: "center",
    paddingBottom: espacamento.xl,
  },
  apresentacao: {
    gap: espacamento.sm,
  },
  navegacao: {
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
    letterSpacing: -0.7,
  },
  descricao: {
    fontSize: tipografia.corpo,
    lineHeight: 25,
    maxWidth: 480,
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
