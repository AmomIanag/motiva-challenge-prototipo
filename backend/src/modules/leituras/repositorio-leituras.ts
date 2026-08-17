import { poolBancoDados } from "../../config/banco-de-dados";
import type {
  LeituraVegetacao,
  LeituraVegetacaoSemImagem,
  StatusVegetacao,
} from "./leitura";

interface LinhaLeitura {
  id: string;
  dispositivo_id: string;
  altura_cm: string;
  status: StatusVegetacao;
  medido_em: Date;
  nome_imagem: string | null;
  nome_imagem_diagnostico: string | null;
}

function mapearLinhaParaLeitura(linha: LinhaLeitura): LeituraVegetacao {
  return {
    id: linha.id,
    dispositivoId: linha.dispositivo_id,
    alturaCm: Number(linha.altura_cm),
    status: linha.status,
    medidoEm: linha.medido_em.toISOString(),
    imagemUrl: linha.nome_imagem
      ? `/uploads/${encodeURIComponent(linha.nome_imagem)}`
      : null,
    imagemDiagnosticoUrl: linha.nome_imagem_diagnostico
      ? `/uploads/${encodeURIComponent(linha.nome_imagem_diagnostico)}`
      : null,
  };
}

const COLUNAS_LEITURA = `
  id,
  dispositivo_id,
  altura_cm,
  status,
  medido_em,
  nome_imagem,
  nome_imagem_diagnostico
`;

export interface ArquivosAssociadosLeitura {
  id: string;
  nomeImagem: string | null;
  nomeImagemDiagnostico: string | null;
}

interface LinhaArquivosAssociados {
  id: string;
  nome_imagem: string | null;
  nome_imagem_diagnostico: string | null;
}

function mapearArquivosAssociados(
  linha: LinhaArquivosAssociados,
): ArquivosAssociadosLeitura {
  return {
    id: linha.id,
    nomeImagem: linha.nome_imagem,
    nomeImagemDiagnostico: linha.nome_imagem_diagnostico,
  };
}

export async function buscarLeituras(): Promise<LeituraVegetacao[]> {
  const resultado = await poolBancoDados.query<LinhaLeitura>(`
    SELECT ${COLUNAS_LEITURA}
    FROM leituras
    ORDER BY medido_em ASC, id ASC
  `);

  return resultado.rows.map(mapearLinhaParaLeitura);
}

export async function buscarUltimaLeitura(): Promise<LeituraVegetacao | null> {
  const resultado = await poolBancoDados.query<LinhaLeitura>(`
    SELECT ${COLUNAS_LEITURA}
    FROM leituras
    ORDER BY medido_em DESC, id DESC
    LIMIT 1
  `);

  const ultimaLinha = resultado.rows[0];
  return ultimaLinha ? mapearLinhaParaLeitura(ultimaLinha) : null;
}

export async function inserirLeitura(
  leitura: LeituraVegetacaoSemImagem,
  nomeImagem: string,
  nomeImagemDiagnostico: string,
): Promise<LeituraVegetacao> {
  const resultado = await poolBancoDados.query<LinhaLeitura>(
    `
      INSERT INTO leituras (
        dispositivo_id,
        altura_cm,
        status,
        medido_em,
        nome_imagem,
        nome_imagem_diagnostico
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${COLUNAS_LEITURA}
    `,
    [
      leitura.dispositivoId,
      leitura.alturaCm,
      leitura.status,
      leitura.medidoEm,
      nomeImagem,
      nomeImagemDiagnostico,
    ],
  );

  const linhaCriada = resultado.rows[0];

  if (!linhaCriada) {
    throw new Error("O PostgreSQL não retornou a leitura criada.");
  }

  return mapearLinhaParaLeitura(linhaCriada);
}

export async function excluirLeituraPorId(
  id: string,
): Promise<ArquivosAssociadosLeitura | null> {
  const cliente = await poolBancoDados.connect();

  try {
    await cliente.query("BEGIN");
    const resultado = await cliente.query<LinhaArquivosAssociados>(
      `
        SELECT id, nome_imagem, nome_imagem_diagnostico
        FROM leituras
        WHERE id = $1
        FOR UPDATE
      `,
      [id],
    );
    const linha = resultado.rows[0];

    if (!linha) {
      await cliente.query("ROLLBACK");
      return null;
    }

    await cliente.query("DELETE FROM leituras WHERE id = $1", [id]);
    await cliente.query("COMMIT");
    return mapearArquivosAssociados(linha);
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

export async function excluirTodasLeituras(): Promise<
  ArquivosAssociadosLeitura[]
> {
  const cliente = await poolBancoDados.connect();

  try {
    await cliente.query("BEGIN");
    const resultado = await cliente.query<LinhaArquivosAssociados>(`
      SELECT id, nome_imagem, nome_imagem_diagnostico
      FROM leituras
      FOR UPDATE
    `);

    await cliente.query("DELETE FROM leituras");
    await cliente.query("COMMIT");
    return resultado.rows.map(mapearArquivosAssociados);
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}
