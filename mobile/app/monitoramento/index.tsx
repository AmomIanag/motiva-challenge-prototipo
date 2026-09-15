import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Botao } from "@/components/botao";
import { CabecalhoAplicativo } from "@/components/cabecalho-aplicativo";
import { Cartao } from "@/components/cartao";
import { CartaoLeitura } from "@/components/cartao-leitura";
import { ImagemLeitura } from "@/components/imagem-leitura";
import { Tela } from "@/components/tela";
import { descreverErroApi } from "@/services/api";
import { listarDispositivos } from "@/services/dispositivos";
import { listarLeituras } from "@/services/leituras";
import { espacamento, raios, tipografia, useTema } from "@/theme/tema";
import type { Dispositivo } from "@/types/dispositivo";
import type { LeituraVegetacao } from "@/types/leitura";
import { obterLeituraMaisRecente, obterUltimasLeiturasPorDispositivo, ordenarLeiturasRecentes } from "@/utils/monitoramento";

export default function Monitoramento() {
  const router = useRouter();
  const tema = useTema();
  const [leituras, setLeituras] = useState<LeituraVegetacao[]>([]);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async (manual = false) => {
    if (manual) setAtualizando(true);
    else setCarregando(true);
    setErro("");
    setMensagem("");

    try {
      const [novasLeituras, novosDispositivos] = await Promise.all([
        listarLeituras(),
        listarDispositivos(),
      ]);
      setLeituras(novasLeituras);
      setDispositivos(novosDispositivos);
      setCarregado(true);
      if (manual) setMensagem("Monitoramento atualizado.");
    } catch (falha) {
      setErro(descreverErroApi(falha, "Não foi possível carregar o monitoramento."));
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const recentes = useMemo(() => ordenarLeiturasRecentes(leituras).slice(0, 5), [leituras]);
  const ultimaLeitura = obterLeituraMaisRecente(leituras);
  const ultimasPorDispositivo = obterUltimasLeiturasPorDispositivo(leituras);
  const dispositivosComLeitura = dispositivos.filter(({ dispositivoId }) =>
    ultimasPorDispositivo.has(dispositivoId),
  ).length;

  return (
    <Tela aoAtualizar={() => void carregar(true)} atualizando={atualizando}>
      <CabecalhoAplicativo tituloSecundario="Monitoramento" />

      <View style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Text style={[styles.sobretitulo, { color: tema.cores.primaria }]}>VISÃO OPERACIONAL</Text>
          <Text accessibilityRole="header" style={[styles.titulo, { color: tema.cores.texto }]}>Monitoramento</Text>
          <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>Consulte a situação mais recente e as últimas leituras recebidas.</Text>
        </View>

        <Botao
          aoPressionar={() => void carregar(true)}
          desabilitado={atualizando}
          rotulo={atualizando ? "Atualizando..." : "Atualizar monitoramento"}
          variante="secundario"
        />

        {erro ? (
          <View accessibilityLiveRegion="assertive" style={[styles.aviso, { backgroundColor: tema.cores.perigoSuave }]}>
            <Text style={[styles.avisoTitulo, { color: tema.cores.perigo }]}>Não foi possível atualizar</Text>
            <Text style={[styles.descricao, { color: tema.cores.texto }]}>{erro}</Text>
          </View>
        ) : null}

        {mensagem ? <Text accessibilityLiveRegion="polite" style={[styles.mensagem, { color: tema.cores.sucesso }]}>{mensagem}</Text> : null}

        {carregando && !carregado ? (
          <View accessibilityRole="progressbar" style={styles.carregamento}>
            <ActivityIndicator color={tema.cores.primaria} size="large" />
            <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>Carregando monitoramento...</Text>
          </View>
        ) : null}

        {carregado ? (
          leituras.length === 0 ? (
            <Cartao>
              <Text style={[styles.secaoTitulo, { color: tema.cores.texto }]}>Nenhuma leitura registrada.</Text>
              <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>A situação será exibida quando a primeira leitura for recebida.</Text>
            </Cartao>
          ) : (
            <>
              <View accessibilityLabel="Resumo dos dispositivos" style={styles.resumo}>
                <Resumo rotulo="Dispositivos conhecidos" valor={dispositivos.length} />
                <Resumo rotulo="Com leituras" valor={dispositivosComLeitura} />
              </View>

              {ultimaLeitura ? (
                <View style={styles.secao}>
                  <Text style={[styles.secaoTitulo, { color: tema.cores.texto }]}>Situação atual</Text>
                  <CartaoLeitura leitura={ultimaLeitura} titulo="Leitura global mais recente" />
                  <Cartao>
                    <Text style={[styles.secaoTitulo, { color: tema.cores.texto }]}>Captura mais recente</Text>
                    <ImagemLeitura leitura={ultimaLeitura} />
                  </Cartao>
                </View>
              ) : null}

              <View style={styles.secao}>
                <Text style={[styles.secaoTitulo, { color: tema.cores.texto }]}>Leituras recentes</Text>
                {recentes.map((leitura) => <CartaoLeitura key={leitura.id} leitura={leitura} />)}
              </View>
            </>
          )
        ) : null}

        <Botao aoPressionar={() => router.replace("/")} rotulo="Voltar ao início" variante="secundario" />
      </View>
    </Tela>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: number }) {
  const tema = useTema();
  return (
    <View style={[styles.resumoItem, { backgroundColor: tema.cores.superficie, borderColor: tema.cores.borda }]}>
      <Text style={[styles.resumoValor, { color: tema.cores.primaria }]}>{valor}</Text>
      <Text style={[styles.resumoRotulo, { color: tema.cores.textoSecundario }]}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: { flex: 1, gap: espacamento.lg, paddingBottom: espacamento.xl },
  cabecalho: { gap: espacamento.sm },
  sobretitulo: { fontSize: tipografia.pequena, fontWeight: "800", letterSpacing: 1.4 },
  titulo: { fontSize: tipografia.titulo, fontWeight: "800" },
  descricao: { flexShrink: 1, fontSize: tipografia.corpo, lineHeight: 23 },
  aviso: { borderRadius: raios.md, gap: espacamento.xs, padding: espacamento.md },
  avisoTitulo: { fontSize: tipografia.corpo, fontWeight: "800" },
  mensagem: { fontSize: tipografia.pequena, fontWeight: "700", textAlign: "center" },
  carregamento: { alignItems: "center", gap: espacamento.md, justifyContent: "center", minHeight: 220 },
  resumo: { flexDirection: "row", flexWrap: "wrap", gap: espacamento.sm },
  resumoItem: { borderRadius: raios.md, borderWidth: 1, flexBasis: 145, flexGrow: 1, gap: espacamento.xs, minWidth: 0, padding: espacamento.md },
  resumoValor: { fontSize: 28, fontWeight: "800" },
  resumoRotulo: { fontSize: tipografia.pequena, fontWeight: "700" },
  secao: { gap: espacamento.md },
  secaoTitulo: { fontSize: tipografia.subtitulo, fontWeight: "800" },
});
