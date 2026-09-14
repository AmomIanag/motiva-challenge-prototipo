import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { espacamento, raios, useTema } from "@/theme/tema";

export function Cartao({ children }: PropsWithChildren) {
  const tema = useTema();

  return (
    <View style={[styles.cartao, { backgroundColor: tema.cores.superficie, borderColor: tema.cores.borda }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    borderRadius: raios.lg,
    borderWidth: 1,
    gap: espacamento.sm,
    padding: espacamento.lg,
  },
});
