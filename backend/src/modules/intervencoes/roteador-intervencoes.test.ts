import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";

import express from "express";

import type { StatusVegetacao } from "../leituras/leitura";
import {
  derivarPrioridadeIntervencao,
  transicaoIntervencaoPermitida,
  type Intervencao,
  type StatusIntervencao,
} from "./intervencao";
import {
  criarRoteadorIntervencoes,
  type DependenciasIntervencoes,
} from "./roteador-intervencoes";

interface LeituraTeste {
  id: string;
  dispositivoId: string;
  alturaCm: number;
  status: StatusVegetacao;
  medidoEm: string;
  rodovia: string | null;
  km: string | null;
  sentido: string | null;
  trecho: string | null;
  latitude: number | null;
  longitude: number | null;
}

const instante = "2026-09-13T12:00:00.000Z";

function criarDependenciasEmMemoria(leiturasIniciais: LeituraTeste[]) {
  const leituras = new Map(leiturasIniciais.map((leitura) => [leitura.id, leitura]));
  const intervencoes: Intervencao[] = [];
  let proximoId = 1;

  const dependencias: DependenciasIntervencoes = {
    async listarIntervencoes() {
      return [...intervencoes];
    },
    async criarIntervencao(leituraId) {
      const leitura = leituras.get(leituraId);
      if (!leitura) return { tipo: "leitura_nao_encontrada" };

      const prioridade = derivarPrioridadeIntervencao(leitura.status);
      if (!prioridade) return { tipo: "leitura_segura" };
      if (intervencoes.some((item) => item.leituraId === leituraId)) {
        return { tipo: "duplicada" };
      }

      const intervencao: Intervencao = {
        id: String(proximoId++),
        leituraId,
        dispositivoId: leitura.dispositivoId,
        alturaCm: leitura.alturaCm,
        statusLeitura: leitura.status,
        medidoEm: leitura.medidoEm,
        prioridade,
        rodovia: leitura.rodovia,
        km: leitura.km,
        sentido: leitura.sentido,
        trecho: leitura.trecho,
        latitude: leitura.latitude,
        longitude: leitura.longitude,
        status: "pendente",
        criadaEm: instante,
        iniciadaEm: null,
        concluidaEm: null,
        atualizadaEm: instante,
      };
      intervencoes.push(intervencao);
      return { tipo: "criada", intervencao };
    },
    async atualizarStatusIntervencao(id, status) {
      const intervencao = intervencoes.find((item) => item.id === id);
      if (!intervencao) return { tipo: "nao_encontrada" };
      if (!transicaoIntervencaoPermitida(intervencao.status, status)) {
        return { tipo: "transicao_invalida", statusAtual: intervencao.status };
      }

      intervencao.status = status;
      intervencao.atualizadaEm = "2026-09-13T13:00:00.000Z";
      if (status === "em_atendimento") intervencao.iniciadaEm = intervencao.atualizadaEm;
      if (status === "concluida") intervencao.concluidaEm = intervencao.atualizadaEm;
      return { tipo: "atualizada", intervencao };
    },
  };

  return {
    dependencias,
    intervencoes,
    excluirLeitura(id: string) {
      leituras.delete(id);
      const intervencao = intervencoes.find((item) => item.leituraId === id);
      if (intervencao) intervencao.leituraId = null;
    },
  };
}

async function comServidorTeste(
  dependencias: DependenciasIntervencoes,
  executar: (urlBase: string) => Promise<void>,
): Promise<void> {
  const aplicacao = express();
  aplicacao.use(express.json());
  aplicacao.use("/api/intervencoes", criarRoteadorIntervencoes(dependencias));
  const servidor = aplicacao.listen(0, "127.0.0.1");
  await once(servidor, "listening");
  const endereco = servidor.address();
  assert.ok(endereco && typeof endereco === "object");

  try {
    await executar(`http://127.0.0.1:${endereco.port}`);
  } finally {
    servidor.close();
    await once(servidor, "close");
  }
}

async function requisitar(
  url: string,
  metodo: "GET" | "POST" | "PATCH",
  corpo?: unknown,
) {
  const resposta = await fetch(url, {
    method: metodo,
    headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  return { status: resposta.status, corpo: await resposta.json() };
}

const leituraPerigo: LeituraTeste = {
  id: "900000000000000001",
  dispositivoId: "ESP-01",
  alturaCm: 58.54,
  status: "perigo",
  medidoEm: "2026-08-18T23:50:59.000Z",
  rodovia: "BR-101",
  km: "204+500",
  sentido: "Norte",
  trecho: "Ponte principal",
  latitude: -27.595377,
  longitude: -48.54805,
};

const leituraCuidado: LeituraTeste = {
  ...leituraPerigo,
  id: "900000000000000002",
  dispositivoId: "ESP-02",
  alturaCm: 31,
  status: "cuidado",
  rodovia: null,
  km: null,
  sentido: null,
  trecho: null,
  latitude: null,
  longitude: null,
};

test("cria snapshots de perigo e cuidado com prioridades derivadas e IDs string", async () => {
  const memoria = criarDependenciasEmMemoria([leituraPerigo, leituraCuidado]);

  await comServidorTeste(memoria.dependencias, async (urlBase) => {
    const perigo = await requisitar(`${urlBase}/api/intervencoes`, "POST", {
      leituraId: leituraPerigo.id,
    });
    const cuidado = await requisitar(`${urlBase}/api/intervencoes`, "POST", {
      leituraId: leituraCuidado.id,
    });

    assert.equal(perigo.status, 201);
    assert.equal(perigo.corpo.intervencao.prioridade, "alta");
    assert.equal(typeof perigo.corpo.intervencao.id, "string");
    assert.equal(perigo.corpo.intervencao.rodovia, "BR-101");
    assert.equal(cuidado.status, 201);
    assert.equal(cuidado.corpo.intervencao.prioridade, "moderada");
    assert.equal(cuidado.corpo.intervencao.latitude, null);
  });
});

test("rejeita leitura segura, inexistente, duplicada e IDs inválidos", async () => {
  const leituraSegura = { ...leituraCuidado, id: "3", status: "seguro" as const };
  const memoria = criarDependenciasEmMemoria([leituraPerigo, leituraSegura]);

  await comServidorTeste(memoria.dependencias, async (urlBase) => {
    const primeira = await requisitar(`${urlBase}/api/intervencoes`, "POST", {
      leituraId: leituraPerigo.id,
    });
    assert.equal(primeira.status, 201);
    assert.equal(
      (await requisitar(`${urlBase}/api/intervencoes`, "POST", {
        leituraId: leituraPerigo.id,
      })).status,
      409,
    );
    assert.equal(
      (await requisitar(`${urlBase}/api/intervencoes`, "POST", { leituraId: "3" })).status,
      409,
    );
    assert.equal(
      (await requisitar(`${urlBase}/api/intervencoes`, "POST", { leituraId: "999" })).status,
      404,
    );
    assert.equal(
      (await requisitar(`${urlBase}/api/intervencoes`, "POST", { leituraId: 1 })).status,
      400,
    );
  });
});

test("lista intervenções e executa somente o fluxo de status permitido", async () => {
  const memoria = criarDependenciasEmMemoria([leituraPerigo]);

  await comServidorTeste(memoria.dependencias, async (urlBase) => {
    await requisitar(`${urlBase}/api/intervencoes`, "POST", {
      leituraId: leituraPerigo.id,
    });
    const lista = await requisitar(`${urlBase}/api/intervencoes`, "GET");
    assert.equal(lista.status, 200);
    assert.equal(lista.corpo.length, 1);

    const conclusaoAntecipada = await requisitar(
      `${urlBase}/api/intervencoes/1/status`,
      "PATCH",
      { status: "concluida" },
    );
    assert.equal(conclusaoAntecipada.status, 409);

    const inicio = await requisitar(`${urlBase}/api/intervencoes/1/status`, "PATCH", {
      status: "em_atendimento",
    });
    assert.equal(inicio.status, 200);
    assert.equal(inicio.corpo.intervencao.status, "em_atendimento");
    assert.equal(typeof inicio.corpo.intervencao.iniciadaEm, "string");

    const conclusao = await requisitar(`${urlBase}/api/intervencoes/1/status`, "PATCH", {
      status: "concluida",
    });
    assert.equal(conclusao.status, 200);
    assert.equal(conclusao.corpo.intervencao.status, "concluida");
    assert.equal(typeof conclusao.corpo.intervencao.concluidaEm, "string");

    const regressao = await requisitar(`${urlBase}/api/intervencoes/1/status`, "PATCH", {
      status: "em_atendimento",
    });
    assert.equal(regressao.status, 409);
  });
});

test("preserva snapshot quando a leitura de origem é excluída", async () => {
  const memoria = criarDependenciasEmMemoria([leituraPerigo]);
  const criada = await memoria.dependencias.criarIntervencao(leituraPerigo.id);
  assert.equal(criada.tipo, "criada");
  memoria.excluirLeitura(leituraPerigo.id);

  assert.equal(memoria.intervencoes[0].leituraId, null);
  assert.equal(memoria.intervencoes[0].dispositivoId, "ESP-01");
  assert.equal(memoria.intervencoes[0].alturaCm, 58.54);
  assert.equal(memoria.intervencoes[0].rodovia, "BR-101");
});
