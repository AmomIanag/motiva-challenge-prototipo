import { ErroApi, requisitarApi } from "@/services/api";
import type { Intervencao, StatusIntervencao } from "@/types/intervencao";

interface RespostaAtualizacaoIntervencao {
  mensagem: string;
  intervencao: Intervencao;
}

function respostaAtualizacaoValida(valor: unknown): valor is RespostaAtualizacaoIntervencao {
  return (
    valor !== null &&
    typeof valor === "object" &&
    "intervencao" in valor &&
    valor.intervencao !== null &&
    typeof valor.intervencao === "object"
  );
}

export function listarIntervencoes(): Promise<Intervencao[]> {
  return requisitarApi<Intervencao[]>("/api/intervencoes");
}

export async function atualizarStatusIntervencao(
  id: string,
  status: StatusIntervencao,
): Promise<Intervencao> {
  const resposta = await requisitarApi<unknown>(
    `/api/intervencoes/${encodeURIComponent(id)}/status`,
    {
      body: JSON.stringify({ status }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
  );

  if (!respostaAtualizacaoValida(resposta)) {
    throw new ErroApi("A API não retornou os dados da intervenção atualizada.");
  }

  return resposta.intervencao;
}
