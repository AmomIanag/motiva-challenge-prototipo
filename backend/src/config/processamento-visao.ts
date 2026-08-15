import { resolve } from "node:path";

const RAIZ_PROJETO = resolve(__dirname, "../../..");

export const CONFIGURACAO_PROCESSAMENTO_VISAO = {
  executavelPython: resolve(
    RAIZ_PROJETO,
    "vision",
    ".venv",
    "Scripts",
    "python.exe",
  ),
  scriptMedicao: resolve(
    RAIZ_PROJETO,
    "vision",
    "src",
    "medir_vegetacao.py",
  ),
  tempoLimiteMs: 30_000,
} as const;

export const DISPOSITIVO_PADRAO_PROTOTIPO = "ESP-01";
