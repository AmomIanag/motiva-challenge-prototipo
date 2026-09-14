import { useColorScheme } from "react-native";

const coresComuns = {
  primaria: "#5B4ACB",
  primariaPressionada: "#4939B5",
  primariaSuave: "#EEEAFE",
  sucesso: "#187A5B",
  sucessoSuave: "#E5F5EF",
  cuidado: "#A66608",
  cuidadoSuave: "#FFF3D6",
  perigo: "#B63549",
  perigoSuave: "#FDE8EC",
  textoSobrePrimaria: "#FFFFFF",
};

const coresClaras = {
  ...coresComuns,
  fundo: "#F5F5F8",
  superficie: "#FFFFFF",
  superficieSecundaria: "#F0F0F5",
  borda: "#DEDEE8",
  texto: "#1D1D26",
  textoSecundario: "#626273",
};

const coresEscuras = {
  ...coresComuns,
  primaria: "#9C8CF4",
  primariaPressionada: "#8675E8",
  primariaSuave: "#292541",
  fundo: "#0F1016",
  superficie: "#191B26",
  superficieSecundaria: "#222431",
  borda: "#303343",
  texto: "#F5F5F8",
  textoSecundario: "#B7B8C5",
  sucesso: "#55C79F",
  sucessoSuave: "#173A30",
  cuidado: "#F2B95F",
  cuidadoSuave: "#3D3018",
  perigo: "#F17889",
  perigoSuave: "#43232A",
};

export const espacamento = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const raios = {
  sm: 10,
  md: 16,
  lg: 24,
  arredondado: 999,
};

export const tipografia = {
  pequena: 13,
  corpo: 16,
  subtitulo: 19,
  titulo: 32,
};

export function useTema() {
  const escuro = useColorScheme() === "dark";

  return {
    cores: escuro ? coresEscuras : coresClaras,
    escuro,
  };
}
