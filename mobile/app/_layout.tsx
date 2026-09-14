import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useTema } from "@/theme/tema";

function Navegacao() {
  const tema = useTema();

  return (
    <>
      <StatusBar style={tema.escuro ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: tema.cores.fundo },
          headerShown: false,
        }}
      />
    </>
  );
}

export default function LayoutRaiz() {
  return (
    <SafeAreaProvider>
      <Navegacao />
    </SafeAreaProvider>
  );
}
