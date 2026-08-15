import { poolBancoDados } from "../../config/banco-de-dados";
import type {
  LeituraVegetacao,
  LeituraVegetacaoSemImagem,
  StatusVegetacao,
} from "./leitura";

interface LinhaLeitura {
  dispositivo_id: string;
  altura_cm: string;
  status: StatusVegetacao;
  medido_em: Date;
  nome_imagem: string | null;
}

function mapearLinhaParaLeitura(linha: LinhaLeitura): LeituraVegetacao {
  return {
    dispositivoId: linha.dispositivo_id,
    alturaCm: Number(linha.altura_cm),
    status: linha.status,
    medidoEm: linha.medido_em.toISOString(),
    imagemUrl: linha.nome_imagem
      ? `/uploads/${encodeURIComponent(linha.nome_imagem)}`
      : null,
  };
}

const COLUNAS_LEITURA = `
  dispositivo_id, altura_cm, status, medido_em, nome_imagem
`;

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
): Promise<LeituraVegetacao> {
  const resultado = await poolBancoDados.query<LinhaLeitura>(
    `
      INSERT INTO leituras (
        dispositivo_id,
        altura_cm,
        status,
        medido_em,
        nome_imagem
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${COLUNAS_LEITURA}
    `,
    [
      leitura.dispositivoId,
      leitura.alturaCm,
      leitura.status,
      leitura.medidoEm,
      nomeImagem,
    ],
  );

  const linhaCriada = resultado.rows[0];

  if (!linhaCriada) {
    throw new Error("O PostgreSQL não retornou a leitura criada.");
  }

  return mapearLinhaParaLeitura(linhaCriada);
}
