import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";

import express from "express";

import type {
  DadosLocalizacaoDispositivo,
  Dispositivo,
} from "./dispositivo";
import { criarRoteadorDispositivos } from "./roteador-dispositivos";

const dispositivoSemLocalizacao: Dispositivo = {
  dispositivoId: "esp32-cam-01",
  rodovia: null,
  km: null,
  sentido: null,
  trecho: null,
  latitude: null,
  longitude: null,
  origemLocalizacao: null,
  localizacaoAtualizadaEm: null,
};

async function executarRequisicao(
  metodo: "GET" | "PUT",
  caminho: string,
  corpo?: unknown,
  aoSalvar?: (
    dispositivoId: string,
    dados: DadosLocalizacaoDispositivo,
  ) => Dispositivo,
) {
  const aplicacao = express();
  aplicacao.use(express.json());
  aplicacao.use(
    "/api/dispositivos",
    criarRoteadorDispositivos({
      async listarDispositivos() {
        return [dispositivoSemLocalizacao];
      },
      async salvarLocalizacaoDispositivo(dispositivoId, dados) {
        return aoSalvar?.(dispositivoId, dados) ?? {
          dispositivoId,
          ...dados,
          localizacaoAtualizadaEm: "2026-09-13T12:00:00.000Z",
        };
      },
    }),
  );

  const servidor = aplicacao.listen(0);
  await once(servidor, "listening");
  const endereco = servidor.address();
  assert.ok(endereco && typeof endereco === "object");

  try {
    const resposta = await fetch(
      `http://127.0.0.1:${endereco.port}${caminho}`,
      {
        method: metodo,
        headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      },
    );
    return {
      status: resposta.status,
      corpo: (await resposta.json()) as Record<string, unknown> | Dispositivo[],
    };
  } finally {
    servidor.close();
    await once(servidor, "close");
  }
}

test("lista dispositivo conhecido por leitura mesmo sem localização", async () => {
  const resultado = await executarRequisicao("GET", "/api/dispositivos");

  assert.equal(resultado.status, 200);
  assert.deepEqual(resultado.corpo, [dispositivoSemLocalizacao]);
});

test("salva e atualiza a localização de um dispositivo existente", async () => {
  let dadosRecebidos: DadosLocalizacaoDispositivo | undefined;
  const resultado = await executarRequisicao(
    "PUT",
    "/api/dispositivos/esp32-cam-01/localizacao",
    {
      rodovia: " BR-101 ",
      km: "204+500",
      sentido: "Norte",
      trecho: "Ponte principal",
      latitude: -27.595377,
      longitude: -48.54805,
      origemLocalizacao: "manual",
    },
    (dispositivoId, dados) => {
      dadosRecebidos = dados;
      return {
        dispositivoId,
        ...dados,
        localizacaoAtualizadaEm: "2026-09-13T12:00:00.000Z",
      };
    },
  );

  assert.equal(resultado.status, 200);
  assert.deepEqual(dadosRecebidos, {
    rodovia: "BR-101",
    km: "204+500",
    sentido: "Norte",
    trecho: "Ponte principal",
    latitude: -27.595377,
    longitude: -48.54805,
    origemLocalizacao: "manual",
  });
  assert.equal(
    (resultado.corpo as { dispositivo: Dispositivo }).dispositivo.dispositivoId,
    "esp32-cam-01",
  );
});

test("aceita campos opcionais nulos e textos vazios como nulos", async () => {
  let dadosRecebidos: DadosLocalizacaoDispositivo | undefined;
  const resultado = await executarRequisicao(
    "PUT",
    "/api/dispositivos/esp32-cam-01/localizacao",
    { rodovia: " ", km: null, latitude: null, longitude: null },
    (_dispositivoId, dados) => {
      dadosRecebidos = dados;
      return { ...dispositivoSemLocalizacao, ...dados };
    },
  );

  assert.equal(resultado.status, 200);
  assert.deepEqual(dadosRecebidos, {
    rodovia: null,
    km: null,
    sentido: null,
    trecho: null,
    latitude: null,
    longitude: null,
    origemLocalizacao: null,
  });
});

for (const [descricao, corpo] of [
  ["latitude sem longitude", { latitude: -20 }],
  ["longitude sem latitude", { longitude: -40 }],
  ["latitude fora do intervalo", { latitude: 91, longitude: -40 }],
  ["longitude fora do intervalo", { latitude: -20, longitude: -181 }],
  ["coordenada que não é número", { latitude: "-20", longitude: -40 }],
  [
    "origem inválida",
    { latitude: -20, longitude: -40, origemLocalizacao: "gps_dispositivo" },
  ],
] as const) {
  test(`rejeita ${descricao}`, async () => {
    const resultado = await executarRequisicao(
      "PUT",
      "/api/dispositivos/esp32-cam-01/localizacao",
      corpo,
    );

    assert.equal(resultado.status, 400);
    assert.equal(typeof (resultado.corpo as { erro: string }).erro, "string");
  });
}

test("rejeita dispositivoId vazio", async () => {
  const resultado = await executarRequisicao(
    "PUT",
    "/api/dispositivos/%20/localizacao",
    {},
  );

  assert.equal(resultado.status, 400);
});
