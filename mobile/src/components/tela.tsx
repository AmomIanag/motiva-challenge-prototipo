import type { PropsWithChildren } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { espacamento, useTema } from "@/theme/tema";

interface PropriedadesTela extends PropsWithChildren {
  aoAtualizar?: () => void;
  atualizando?: boolean;
}

export function Tela({ aoAtualizar, atualizando = false, children }: PropriedadesTela) {
  const tema = useTema();

  return (
    <SafeAreaView edges={["top", "right", "bottom", "left"]} style={[styles.areaSegura, { backgroundColor: tema.cores.fundo }]}>
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          aoAtualizar ? (
            <RefreshControl
              colors={[tema.cores.primaria]}
              onRefresh={aoAtualizar}
              progressBackgroundColor={tema.cores.superficie}
              refreshing={atualizando}
              tintColor={tema.cores.primaria}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  areaSegura: {
    flex: 1,
  },
  conteudo: {
    flexGrow: 1,
    gap: espacamento.xl,
    marginHorizontal: "auto",
    maxWidth: 680,
    paddingHorizontal: espacamento.lg,
    paddingVertical: espacamento.lg,
    width: "100%",
  },
});
