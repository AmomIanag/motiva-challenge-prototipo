import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { AddressInfo } from "node:net";

import express from "express";

import { limparImagensAssociadas } from "./limpar-imagens-leituras";
import {
  criarRoteadorExclusaoLeituras,
  type DependenciasExclusaoLeituras,
} from "./roteador-exclusao-leituras";
import type { ArquivosAssociadosLeitura } from "./repositorio-leituras";

async function comServidorTeste(
  dependencias: DependenciasExclusaoLeituras,
  executar: (urlBase: string) => Promise<void>,
): Promise<void> {
  const aplicacao = express();
  aplicacao.use(
    "/api/leituras",
    criarRoteadorExclusaoLeituras(dependencias),
  );
  const servidor = aplicacao.listen(0, "127.0.0.1");
  await new Promise<void>((resolver) => servidor.once("listening", resolver));
  const endereco = servidor.address() as AddressInfo;

  try {
    await executar(`http://127.0.0.1:${endereco.port}`);
  } finally {
    await new Promise<void>((resolver, rejeitar) =>
      servidor.close((erro) => (erro ? rejeitar(erro) : resolver())),
    );
  }
}

test("DELETE individual, 404, validação do ID e limpeza em massa", async () => {
  const leituraTeste: ArquivosAssociadosLeitura = {
    id: "900000000000000001",
    nomeImagem: "leitura-teste.jpg",
    nomeImagemDiagnostico: "leitura-teste-diagnostico.jpg",
  };
  const limpezas: ArquivosAssociadosLeitura[][] = [];
  let leituras = [leituraTeste];
  const dependencias: DependenciasExclusaoLeituras = {
    async excluirLeituraPorId(id) {
      const leitura = leituras.find((item) => item.id === id) ?? null;
      leituras = leituras.filter((item) => item.id !== id);
      return leitura;
    },
    async excluirTodasLeituras() {
      const excluidas = leituras;
      leituras = [];
      return excluidas;
    },
    async limparImagensAssociadas(itens) {
      limpezas.push(itens);
    },
  };

  await comServidorTeste(dependencias, async (urlBase) => {
    const respostaInvalida = await fetch(`${urlBase}/api/leituras/uuid-invalido`, {
      method: "DELETE",
    });
    assert.equal(respostaInvalida.status, 400);
    const respostaForaBigint = await fetch(
      `${urlBase}/api/leituras/9223372036854775808`,
      { method: "DELETE" },
    );
    assert.equal(respostaForaBigint.status, 400);

    const respostaExclusao = await fetch(
      `${urlBase}/api/leituras/${leituraTeste.id}`,
      { method: "DELETE" },
    );
    assert.equal(respostaExclusao.status, 200);
    assert.deepEqual(await respostaExclusao.json(), {
      mensagem: "Leitura excluída com sucesso.",
      leituraId: leituraTeste.id,
    });
    assert.deepEqual(limpezas, [[leituraTeste]]);

    const respostaNaoEncontrada = await fetch(
      `${urlBase}/api/leituras/${leituraTeste.id}`,
      { method: "DELETE" },
    );
    assert.equal(respostaNaoEncontrada.status, 404);

    leituras = [
      { ...leituraTeste, id: "900000000000000002" },
      { ...leituraTeste, id: "900000000000000003" },
    ];
    const respostaLimpeza = await fetch(`${urlBase}/api/leituras`, {
      method: "DELETE",
    });
    assert.equal(respostaLimpeza.status, 200);
    assert.equal(
      (await respostaLimpeza.json()).quantidadeLeiturasRemovidas,
      2,
    );
    assert.equal(leituras.length, 0);
    assert.equal(limpezas.at(-1)?.length, 2);
  });
});

test("remove somente imagens associadas e bloqueia caminhos externos", async () => {
  const raizTeste = await mkdtemp(join(tmpdir(), "motiva-exclusao-"));
  const diretorioUploads = join(raizTeste, "uploads");
  const original = join(diretorioUploads, "original-teste.jpg");
  const diagnostico = join(diretorioUploads, "diagnostico-teste.jpg");
  const naoRelacionado = join(diretorioUploads, "nao-relacionado.jpg");
  const externo = join(raizTeste, "externo.jpg");
  const avisos: unknown[][] = [];

  try {
    await mkdir(diretorioUploads);
    await Promise.all([
      writeFile(original, "original"),
      writeFile(diagnostico, "diagnostico"),
      writeFile(naoRelacionado, "preservar"),
      writeFile(externo, "preservar"),
    ]);

    await limparImagensAssociadas(
      [
        {
          id: "1",
          nomeImagem: "original-teste.jpg",
          nomeImagemDiagnostico: "diagnostico-teste.jpg",
        },
        {
          id: "2",
          nomeImagem: "../externo.jpg",
          nomeImagemDiagnostico: "imagem-ausente.jpg",
        },
      ],
      {
        diretorioUploads,
        registrarAviso: (...dados) => avisos.push(dados),
      },
    );

    assert.equal(existsSync(original), false);
    assert.equal(existsSync(diagnostico), false);
    assert.equal(existsSync(naoRelacionado), true);
    assert.equal(existsSync(externo), true);
    assert.equal(avisos.length, 1);
  } finally {
    await rm(raizTeste, { recursive: true, force: true });
  }
});

test("falha isolada ao remover arquivo gera warning sem desfazer exclusão", async () => {
  const avisos: unknown[][] = [];

  await limparImagensAssociadas(
    [{ id: "1", nomeImagem: "arquivo.jpg", nomeImagemDiagnostico: null }],
    {
      removerArquivo: async () => {
        throw new Error("falha simulada");
      },
      registrarAviso: (...dados) => avisos.push(dados),
    },
  );

  assert.equal(avisos.length, 1);
});
