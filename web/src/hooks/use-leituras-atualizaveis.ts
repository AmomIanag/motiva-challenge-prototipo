"use client";

import { useRef, useState } from "react";

import { atualizarDashboardAcao } from "@/app/acoes-leituras";
import type { LeituraVegetacao } from "@/types/leitura";

interface PropriedadesLeiturasAtualizaveis {
  leiturasIniciais: LeituraVegetacao[];
  sincronizadoEmInicial: string | null;
  erroInicial: string | null;
  aoAtualizar?: (leituras: LeituraVegetacao[]) => void;
}

export function useLeiturasAtualizaveis({
  leiturasIniciais,
  sincronizadoEmInicial,
  erroInicial,
  aoAtualizar,
}: PropriedadesLeiturasAtualizaveis) {
  const [leituras, setLeituras] = useState(leiturasIniciais);
  const [sincronizadoEm, setSincronizadoEm] = useState(sincronizadoEmInicial);
  const [erroAtualizacao, setErroAtualizacao] = useState(erroInicial);
  const [atualizando, setAtualizando] = useState(false);
  const atualizacaoEmAndamento = useRef(false);
  const cargaInicialFalhou = sincronizadoEm === null && erroAtualizacao !== null;

  async function atualizarLeituras(): Promise<void> {
    if (atualizacaoEmAndamento.current) {
      return;
    }

    atualizacaoEmAndamento.current = true;
    setAtualizando(true);
    setErroAtualizacao(null);

    try {
      const resultado = await atualizarDashboardAcao();
      setLeituras(resultado.leituras);
      setSincronizadoEm(resultado.sincronizadoEm);
      aoAtualizar?.(resultado.leituras);
    } catch {
      setErroAtualizacao("Não foi possível atualizar os dados.");
    } finally {
      atualizacaoEmAndamento.current = false;
      setAtualizando(false);
    }
  }

  return {
    atualizando,
    atualizarLeituras,
    cargaInicialFalhou,
    erroAtualizacao,
    leituras,
    setLeituras,
    sincronizadoEm,
  };
}
