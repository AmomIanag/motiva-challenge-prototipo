import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Botao } from "@/components/botao";
import { CabecalhoAplicativo } from "@/components/cabecalho-aplicativo";
import { Cartao } from "@/components/cartao";
import { CartaoIntervencao } from "@/components/cartao-intervencao";
import { Tela } from "@/components/tela";
import { listarIntervencoes } from "@/services/intervencoes";
import { espacamento, raios, tipografia, useTema } from "@/theme/tema";
import type { Intervencao } from "@/types/intervencao";
import {
  filtrarIntervencoes,
  type FiltroIntervencao,
  ordenarIntervencoes,
} from "@/utils/intervencoes";

const filtros: Array<{ rotulo: string; valor: FiltroIntervencao }> = [
  { rotulo: "Abertas", valor: "abertas" },
  { rotulo: "Pendentes", valor: "pendente" },
  { rotulo: "Em atendimento", valor: "em_atendimento" },
  { rotulo: "Concluídas", valor: "concluida" },
];

const titulosFiltroVazio: Record<FiltroIntervencao, string> = {
  abertas: "Nenhuma intervenção aberta",
  pendente: "Nenhuma intervenção pendente",
  em_atendimento: "Nenhuma intervenção em atendimento",
  concluida: "Nenhuma intervenção concluída",
};

type ModoCarregamento = "inicial" | "silencioso" | "manual";

export default function Servicos() {
  const router = useRouter();
  const tema = useTema();
  const carregouRef = useRef(false);
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [filtro, setFiltro] = useState<FiltroIntervencao>("abertas");
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async (modo: ModoCarregamento) => {
    if (modo === "inicial") setCarregando(true);
    if (modo === "manual") setAtualizando(true);
    setErro("");
    if (modo !== "silencioso") setMensagem("");

    try {
      setIntervencoes(ordenarIntervencoes(await listarIntervencoes()));
      if (modo === "manual") setMensagem("Serviços atualizados.");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível carregar as intervenções.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
      carregouRef.current = true;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar(carregouRef.current ? "silencioso" : "inicial");
    }, [carregar]),
  );

  function atualizarIntervencao(atualizada: Intervencao) {
    setIntervencoes((atuais) =>
      ordenarIntervencoes(atuais.map((item) => (item.id === atualizada.id ? atualizada : item))),
    );
    setMensagem("Situação do serviço atualizada.");
  }

  const exibidas = filtrarIntervencoes(intervencoes, filtro);
  const vazioGeral = !carregando && !erro && intervencoes.length === 0;
  const vazioFiltro = !carregando && !erro && intervencoes.length > 0 && exibidas.length === 0;

  return (
    <Tela aoAtualizar={() => void carregar("manual")} atualizando={atualizando}>
      <CabecalhoAplicativo tituloSecundario="Serviços em campo" />

      <View style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Text style={[styles.sobretitulo, { color: tema.cores.primaria }]}>OPERAÇÃO</Text>
          <Text accessibilityRole="header" style={[styles.titulo, { color: tema.cores.texto }]}>
            Serviços em campo
          </Text>
          <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>
            Consulte os serviços disponíveis e registre o andamento das intervenções.
          </Text>
        </View>

        <Botao
          aoPressionar={() => void carregar("manual")}
          desabilitado={atualizando}
          rotulo={atualizando ? "Atualizando..." : "Atualizar serviços"}
          variante="secundario"
        />

        {erro ? (
          <View accessibilityLiveRegion="assertive" style={[styles.aviso, { backgroundColor: tema.cores.perigoSuave }]}>
            <Text style={[styles.avisoTitulo, { color: tema.cores.perigo }]}>Não foi possível atualizar</Text>
            <Text style={[styles.avisoTexto, { color: tema.cores.texto }]}>{erro}</Text>
          </View>
        ) : null}

        {mensagem ? (
          <Text accessibilityLiveRegion="polite" style={[styles.mensagem, { color: tema.cores.sucesso }]}>
            {mensagem}
          </Text>
        ) : null}

        <View
          accessibilityRole="tablist"
          style={styles.filtros}
        >
          {filtros.map((item) => {
            const selecionado = filtro === item.valor;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: selecionado }}
                key={item.valor}
                onPress={() => setFiltro(item.valor)}
                style={({ pressed }) => [
                  styles.filtro,
                  {
                    backgroundColor: selecionado ? tema.cores.primaria : tema.cores.superficie,
                    borderColor: selecionado ? tema.cores.primaria : tema.cores.borda,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.86}
                  numberOfLines={1}
                  style={[
                    styles.filtroTexto,
                    { color: selecionado ? tema.cores.textoSobrePrimaria : tema.cores.texto },
                  ]}
                >
                  {item.rotulo}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {carregando ? (
          <View accessibilityRole="progressbar" style={styles.carregamento}>
            <ActivityIndicator color={tema.cores.primaria} size="large" />
            <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>Carregando serviços...</Text>
          </View>
        ) : null}

        {vazioGeral ? (
          <Cartao>
            <Text style={[styles.vazioTitulo, { color: tema.cores.texto }]}>Nenhuma intervenção registrada</Text>
            <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>Quando houver serviços reais, eles aparecerão aqui.</Text>
          </Cartao>
        ) : null}

        {vazioFiltro ? (
          <Cartao>
            <Text style={[styles.vazioTitulo, { color: tema.cores.texto }]}>{titulosFiltroVazio[filtro]}</Text>
            <Text style={[styles.descricao, { color: tema.cores.textoSecundario }]}>Selecione outro filtro ou atualize os dados.</Text>
          </Cartao>
        ) : null}

        <View accessibilityLabel={`${exibidas.length} serviços exibidos`} style={styles.lista}>
          {exibidas.map((intervencao) => (
            <CartaoIntervencao
              aoAtualizar={atualizarIntervencao}
              intervencao={intervencao}
              key={intervencao.id}
            />
          ))}
        </View>

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
    flexShrink: 1,
    fontSize: tipografia.corpo,
    lineHeight: 25,
  },
  aviso: {
    borderRadius: raios.md,
    gap: espacamento.xs,
    padding: espacamento.md,
  },
  avisoTitulo: {
    fontSize: tipografia.corpo,
    fontWeight: "800",
  },
  avisoTexto: {
    fontSize: tipografia.pequena,
    lineHeight: 20,
  },
  mensagem: {
    fontSize: tipografia.pequena,
    fontWeight: "700",
    textAlign: "center",
  },
  filtros: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacamento.sm,
  },
  filtro: {
    alignItems: "center",
    borderRadius: raios.arredondado,
    borderWidth: 1,
    flexBasis: 145,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 46,
    minWidth: 145,
    paddingHorizontal: espacamento.md,
  },
  filtroTexto: {
    fontSize: tipografia.pequena,
    fontWeight: "800",
  },
  carregamento: {
    alignItems: "center",
    gap: espacamento.md,
    justifyContent: "center",
    minHeight: 180,
  },
  vazioTitulo: {
    fontSize: tipografia.subtitulo,
    fontWeight: "800",
  },
  lista: {
    gap: espacamento.md,
  },
});
