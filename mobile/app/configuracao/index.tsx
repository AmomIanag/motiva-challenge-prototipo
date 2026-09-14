import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Botao } from "@/components/botao";
import { CabecalhoAplicativo } from "@/components/cabecalho-aplicativo";
import { Cartao } from "@/components/cartao";
import { Tela } from "@/components/tela";
import { obterUrlApiConfigurada } from "@/lib/configuracao-api";
import { testarSaudeApi } from "@/services/saude";
import { espacamento, tipografia, useTema } from "@/theme/tema";

type EstadoTeste = "inicial" | "testando" | "sucesso" | "erro";

export default function Configuracao() {
  const router = useRouter();
  const tema = useTema();
  const [estado, setEstado] = useState<EstadoTeste>("inicial");
  const [mensagem, setMensagem] = useState("");
  const urlApi = obterUrlApiConfigurada();

  async function testarConexao() {
    setEstado("testando");
    setMensagem("");

    try {
      await testarSaudeApi();
      setEstado("sucesso");
      setMensagem("API acessível.");
    } catch (erro) {
      setEstado("erro");
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível acessar a API.");
    }
  }

  const corResultado = estado === "sucesso" ? tema.cores.sucesso : tema.cores.perigo;

  return (
    <Tela>
      <CabecalhoAplicativo tituloSecundario="Configuração" />

      <View style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Text style={[styles.sobretitulo, { color: tema.cores.primaria }]}>DIAGNÓSTICO</Text>
          <Text style={[styles.titulo, { color: tema.cores.texto }]}>Conexão com a API</Text>
          <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>
            Este teste verifica somente a comunicação entre o aplicativo e o backend.
          </Text>
        </View>

        <Cartao>
          <Text style={[styles.rotulo, { color: tema.cores.textoSecundario }]}>URL configurada</Text>
          <Text selectable style={[styles.valor, { color: tema.cores.texto }]}>
            {urlApi || "EXPO_PUBLIC_API_URL não configurada"}
          </Text>
        </Cartao>

        <Botao
          rotulo="Testar conexão"
          desabilitado={estado === "testando" || !urlApi}
          aoPressionar={testarConexao}
        />

        {estado === "testando" ? (
          <View accessibilityRole="progressbar" style={styles.resultado}>
            <ActivityIndicator color={tema.cores.primaria} />
            <Text style={{ color: tema.cores.textoSecundario }}>Testando conexão...</Text>
          </View>
        ) : null}

        {estado === "sucesso" || estado === "erro" ? (
          <Text accessibilityLiveRegion="polite" style={[styles.mensagem, { color: corResultado }]}>
            {mensagem}
          </Text>
        ) : null}

        {!urlApi ? (
          <Text style={[styles.ajuda, { color: tema.cores.textoSecundario }]}>
            Defina EXPO_PUBLIC_API_URL no arquivo .env local. Em um dispositivo físico, use o IPv4 LAN do computador, não localhost.
          </Text>
        ) : null}

        <Botao rotulo="Voltar" variante="secundario" aoPressionar={() => router.replace("/")} />
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
  rotulo: {
    fontSize: tipografia.pequena,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  valor: {
    fontSize: tipografia.corpo,
    fontWeight: "600",
  },
  resultado: {
    alignItems: "center",
    flexDirection: "row",
    gap: espacamento.sm,
    justifyContent: "center",
  },
  mensagem: {
    fontSize: tipografia.corpo,
    fontWeight: "700",
    textAlign: "center",
  },
  ajuda: {
    fontSize: tipografia.pequena,
    lineHeight: 20,
    textAlign: "center",
  },
});
