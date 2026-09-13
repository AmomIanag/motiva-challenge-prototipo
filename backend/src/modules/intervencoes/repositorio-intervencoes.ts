import type { PoolClient } from "pg";

import { poolBancoDados } from "../../config/banco-de-dados";
import type { StatusVegetacao } from "../leituras/leitura";
import type {
  Intervencao,
  PrioridadeIntervencao,
  ResultadoCriacaoIntervencao,
  ResultadoTransicaoIntervencao,
  StatusIntervencao,
} from "./intervencao";
import {
  derivarPrioridadeIntervencao,
  transicaoIntervencaoPermitida,
} from "./intervencao";

interface LinhaIntervencao {
  id: string;
  leitura_id: string | null;
  dispositivo_id: string;
  altura_cm: string;
  status_leitura: StatusVegetacao;
  medido_em: Date | string;
  prioridade: PrioridadeIntervencao;
  rodovia: string | null;
  km: string | null;
  sentido: string | null;
  trecho: string | null;
  latitude: number | null;
  longitude: number | null;
  status: StatusIntervencao;
  criada_em: Date | string;
  iniciada_em: Date | string | null;
  concluida_em: Date | string | null;
  atualizada_em: Date | string;
}

interface LinhaOrigemIntervencao {
  dispositivo_id: string;
  altura_cm: string;
  status: StatusVegetacao;
  medido_em: Date | string;
  rodovia: string | null;
  km: string | null;
  sentido: string | null;
  trecho: string | null;
  latitude: number | null;
  longitude: number | null;
}

const COLUNAS_INTERVENCAO = `
  id,
  leitura_id,
  dispositivo_id,
  altura_cm,
  status_leitura,
  medido_em,
  prioridade,
  rodovia,
  km,
  sentido,
  trecho,
  latitude,
  longitude,
  status,
  criada_em,
  iniciada_em,
  concluida_em,
  atualizada_em
`;

function instanteIso(valor: Date | string): string {
  return new Date(valor).toISOString();
}

function instanteIsoOuNulo(valor: Date | string | null): string | null {
  return valor === null ? null : instanteIso(valor);
}

function mapearIntervencao(linha: LinhaIntervencao): Intervencao {
  return {
    id: linha.id,
    leituraId: linha.leitura_id,
    dispositivoId: linha.dispositivo_id,
    alturaCm: Number(linha.altura_cm),
    statusLeitura: linha.status_leitura,
    medidoEm: instanteIso(linha.medido_em),
    prioridade: linha.prioridade,
    rodovia: linha.rodovia,
    km: linha.km,
    sentido: linha.sentido,
    trecho: linha.trecho,
    latitude: linha.latitude === null ? null : Number(linha.latitude),
    longitude: linha.longitude === null ? null : Number(linha.longitude),
    status: linha.status,
    criadaEm: instanteIso(linha.criada_em),
    iniciadaEm: instanteIsoOuNulo(linha.iniciada_em),
    concluidaEm: instanteIsoOuNulo(linha.concluida_em),
    atualizadaEm: instanteIso(linha.atualizada_em),
  };
}

export async function listarIntervencoes(): Promise<Intervencao[]> {
  const resultado = await poolBancoDados.query<LinhaIntervencao>(`
    SELECT ${COLUNAS_INTERVENCAO}
    FROM intervencoes
    ORDER BY
      CASE WHEN status = 'concluida' THEN 1 ELSE 0 END ASC,
      CASE WHEN prioridade = 'alta' THEN 0 ELSE 1 END ASC,
      criada_em DESC,
      id DESC
  `);

  return resultado.rows.map(mapearIntervencao);
}

async function cancelarTransacao(
  cliente: PoolClient,
  resultado: Exclude<ResultadoCriacaoIntervencao, { tipo: "criada" }>,
): Promise<ResultadoCriacaoIntervencao> {
  await cliente.query("ROLLBACK");
  return resultado;
}

export async function criarIntervencao(
  leituraId: string,
): Promise<ResultadoCriacaoIntervencao> {
  const cliente = await poolBancoDados.connect();

  try {
    await cliente.query("BEGIN");
    const origem = await cliente.query<LinhaOrigemIntervencao>(
      `
        SELECT
          leituras.dispositivo_id,
          leituras.altura_cm,
          leituras.status,
          leituras.medido_em,
          dispositivos.rodovia,
          dispositivos.km,
          dispositivos.sentido,
          dispositivos.trecho,
          dispositivos.latitude,
          dispositivos.longitude
        FROM leituras
        LEFT JOIN dispositivos
          ON dispositivos.dispositivo_id = leituras.dispositivo_id
        WHERE leituras.id = $1
        FOR SHARE OF leituras
      `,
      [leituraId],
    );
    const leitura = origem.rows[0];

    if (!leitura) {
      return await cancelarTransacao(cliente, { tipo: "leitura_nao_encontrada" });
    }

    if (leitura.status === "seguro") {
      return await cancelarTransacao(cliente, { tipo: "leitura_segura" });
    }

    const prioridade = derivarPrioridadeIntervencao(leitura.status);

    if (!prioridade) {
      return await cancelarTransacao(cliente, { tipo: "leitura_segura" });
    }
    const insercao = await cliente.query<LinhaIntervencao>(
      `
        INSERT INTO intervencoes (
          leitura_id,
          dispositivo_id,
          altura_cm,
          status_leitura,
          medido_em,
          prioridade,
          rodovia,
          km,
          sentido,
          trecho,
          latitude,
          longitude
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (leitura_id) DO NOTHING
        RETURNING ${COLUNAS_INTERVENCAO}
      `,
      [
        leituraId,
        leitura.dispositivo_id,
        leitura.altura_cm,
        leitura.status,
        leitura.medido_em,
        prioridade,
        leitura.rodovia,
        leitura.km,
        leitura.sentido,
        leitura.trecho,
        leitura.latitude,
        leitura.longitude,
      ],
    );
    const linhaCriada = insercao.rows[0];

    if (!linhaCriada) {
      return await cancelarTransacao(cliente, { tipo: "duplicada" });
    }

    await cliente.query("COMMIT");
    return { tipo: "criada", intervencao: mapearIntervencao(linhaCriada) };
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

export async function atualizarStatusIntervencao(
  id: string,
  novoStatus: StatusIntervencao,
): Promise<ResultadoTransicaoIntervencao> {
  const cliente = await poolBancoDados.connect();

  try {
    await cliente.query("BEGIN");
    const consulta = await cliente.query<{ status: StatusIntervencao }>(
      `SELECT status FROM intervencoes WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const linhaAtual = consulta.rows[0];

    if (!linhaAtual) {
      await cliente.query("ROLLBACK");
      return { tipo: "nao_encontrada" };
    }

    if (!transicaoIntervencaoPermitida(linhaAtual.status, novoStatus)) {
      await cliente.query("ROLLBACK");
      return { tipo: "transicao_invalida", statusAtual: linhaAtual.status };
    }

    const atualizacao = await cliente.query<LinhaIntervencao>(
      `
        UPDATE intervencoes
        SET
          status = $2,
          iniciada_em = CASE
            WHEN $2 = 'em_atendimento' THEN NOW()
            ELSE iniciada_em
          END,
          concluida_em = CASE
            WHEN $2 = 'concluida' THEN NOW()
            ELSE concluida_em
          END,
          atualizada_em = NOW()
        WHERE id = $1
        RETURNING ${COLUNAS_INTERVENCAO}
      `,
      [id, novoStatus],
    );

    await cliente.query("COMMIT");
    return {
      tipo: "atualizada",
      intervencao: mapearIntervencao(atualizacao.rows[0]),
    };
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}
