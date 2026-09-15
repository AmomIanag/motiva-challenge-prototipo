import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Botao } from "@/components/botao";
import { CabecalhoAplicativo } from "@/components/cabecalho-aplicativo";
import { Cartao } from "@/components/cartao";
import { CartaoAlerta } from "@/components/cartao-alerta";
import { Tela } from "@/components/tela";
import { descreverErroApi } from "@/services/api";
import { listarDispositivos } from "@/services/dispositivos";
import { listarIntervencoes } from "@/services/intervencoes";
import { listarLeituras } from "@/services/leituras";
import { espacamento, raios, tipografia, useTema } from "@/theme/tema";
import type { Dispositivo } from "@/types/dispositivo";
import type { Intervencao } from "@/types/intervencao";
import type { LeituraVegetacao } from "@/types/leitura";
import { derivarAlertasOperacionais } from "@/utils/monitoramento";

export default function Alertas() {
  const router = useRouter();
  const tema = useTema();
  const [leituras, setLeituras] = useState<LeituraVegetacao[]>([]);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
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
      const [novasLeituras, novosDispositivos, novasIntervencoes] = await Promise.all([
        listarLeituras(),
        listarDispositivos(),
        listarIntervencoes(),
      ]);
      setLeituras(novasLeituras);
      setDispositivos(novosDispositivos);
      setIntervencoes(novasIntervencoes);
      setCarregado(true);
      if (manual) setMensagem("Alertas atualizados.");
    } catch (falha) {
      setErro(descreverErroApi(falha, "Não foi possível carregar os alertas."));
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const alertas = useMemo(
    () => derivarAlertasOperacionais(leituras, dispositivos, intervencoes),
    [dispositivos, intervencoes, leituras],
  );
  const criticos = alertas.filter(({ nivel }) => nivel === "critico").length;
  const atencao = alertas.length - criticos;

  return (
    <Tela aoAtualizar={() => void carregar(true)} atualizando={atualizando}>
      <CabecalhoAplicativo tituloSecundario="Alertas operacionais" />

      <View style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Text style={[styles.sobretitulo, { color: tema.cores.primaria }]}>ATENÇÃO OPERACIONAL</Text>
          <Text accessibilityRole="header" style={[styles.titulo, { color: tema.cores.texto }]}>Alertas ativos</Text>
          <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>Situação derivada da leitura mais recente de cada dispositivo.</Text>
        </View>

        <Botao
          aoPressionar={() => void carregar(true)}
          desabilitado={atualizando}
          rotulo={atualizando ? "Atualizando..." : "Atualizar alertas"}
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
            <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>Carregando alertas...</Text>
          </View>
        ) : null}

        {carregado ? (
          <>
            <View accessibilityLabel="Resumo dos alertas ativos" style={styles.resumo}>
              <Resumo rotulo="Alertas ativos" tom={tema.cores.primaria} valor={alertas.length} />
              <Resumo rotulo="Críticos" tom={tema.cores.perigo} valor={criticos} />
              <Resumo rotulo="Atenção" tom={tema.cores.cuidado} valor={atencao} />
            </View>

            {leituras.length === 0 ? (
              <Cartao>
                <Text style={[styles.estadoTitulo, { color: tema.cores.texto }]}>Nenhuma leitura registrada</Text>
                <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>Os alertas serão avaliados após a primeira leitura.</Text>
              </Cartao>
            ) : alertas.length === 0 ? (
              <Cartao>
                <Text style={[styles.estadoTitulo, { color: tema.cores.sucesso }]}>Nenhum alerta ativo no momento.</Text>
                <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>As leituras mais recentes estão em estado seguro.</Text>
              </Cartao>
            ) : (
              <View accessibilityLabel={`${alertas.length} alertas ativos`} style={styles.lista}>
                {alertas.map((alerta) => <CartaoAlerta alerta={alerta} key={alerta.dispositivoId} />)}
              </View>
            )}
          </>
        ) : null}

        <Botao aoPressionar={() => router.replace("/")} rotulo="Voltar ao início" variante="secundario" />
      </View>
    </Tela>
  );
}

function Resumo({ rotulo, tom, valor }: { rotulo: string; tom: string; valor: number }) {
  const tema = useTema();
  return (
    <View style={[styles.resumoItem, { backgroundColor: tema.cores.superficie, borderColor: tema.cores.borda }]}>
      <Text style={[styles.resumoValor, { color: tom }]}>{valor}</Text>
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
  resumoItem: { borderRadius: raios.md, borderWidth: 1, flexBasis: 96, flexGrow: 1, gap: espacamento.xs, minWidth: 0, padding: espacamento.md },
  resumoValor: { fontSize: 28, fontWeight: "800" },
  resumoRotulo: { fontSize: tipografia.pequena, fontWeight: "700" },
  estadoTitulo: { fontSize: tipografia.subtitulo, fontWeight: "800" },
  lista: { gap: espacamento.md },
});
