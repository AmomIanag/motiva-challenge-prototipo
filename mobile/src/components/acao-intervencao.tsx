import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Botao } from "@/components/botao";
import { atualizarStatusIntervencao } from "@/services/intervencoes";
import { descreverErroApi } from "@/services/api";
import { espacamento, tipografia, useTema } from "@/theme/tema";
import type { Intervencao, StatusIntervencao } from "@/types/intervencao";
import { obterProximoStatus } from "@/utils/intervencoes";

interface PropriedadesAcao {
  intervencao: Intervencao;
  aoAtualizar: (intervencao: Intervencao) => void;
}

const configuracaoAcao: Record<
  Exclude<StatusIntervencao, "concluida">,
  { confirmacao: string; rotulo: string; sucesso: string; titulo: string }
> = {
  pendente: {
    confirmacao: "Iniciar atendimento desta intervenção?",
    rotulo: "Iniciar atendimento",
    sucesso: "Atendimento iniciado com sucesso.",
    titulo: "Iniciar atendimento",
  },
  em_atendimento: {
    confirmacao: "Confirmar conclusão desta intervenção?",
    rotulo: "Concluir intervenção",
    sucesso: "Intervenção concluída com sucesso.",
    titulo: "Concluir intervenção",
  },
};

export function AcaoIntervencao({ aoAtualizar, intervencao }: PropriedadesAcao) {
  const tema = useTema();
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const proximoStatus = obterProximoStatus(intervencao.status);

  if (!proximoStatus) {
    return (
      <Text style={[styles.concluida, { color: tema.cores.sucesso }]}>Intervenção concluída — nenhuma ação pendente.</Text>
    );
  }

  const configuracao = configuracaoAcao[intervencao.status as Exclude<StatusIntervencao, "concluida">];

  async function executar() {
    if (processando) return;

    setProcessando(true);
    setErro("");
    setMensagem("");

    try {
      const atualizada = await atualizarStatusIntervencao(intervencao.id, proximoStatus!);
      aoAtualizar(atualizada);
      setMensagem(configuracao.sucesso);
    } catch (falha) {
      setErro(descreverErroApi(falha, "Não foi possível atualizar a intervenção."));
    } finally {
      setProcessando(false);
    }
  }

  function confirmar() {
    Alert.alert(configuracao.titulo, configuracao.confirmacao, [
      { style: "cancel", text: "Cancelar" },
      { onPress: () => void executar(), text: "Confirmar" },
    ]);
  }

  return (
    <View style={styles.conteudo}>
      <Botao
        aoPressionar={confirmar}
        desabilitado={processando}
        rotulo={processando ? "Salvando alteração..." : configuracao.rotulo}
      />
      {mensagem ? (
        <Text accessibilityLiveRegion="polite" style={[styles.retorno, { color: tema.cores.sucesso }]}>
          {mensagem}
        </Text>
      ) : null}
      {erro ? (
        <Text accessibilityLiveRegion="assertive" style={[styles.retorno, { color: tema.cores.perigo }]}>
          {erro}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    gap: espacamento.sm,
  },
  concluida: {
    fontSize: tipografia.pequena,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  retorno: {
    fontSize: tipografia.pequena,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center",
  },
});
