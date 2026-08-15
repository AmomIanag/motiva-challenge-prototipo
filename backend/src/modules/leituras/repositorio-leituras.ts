import { poolBancoDados } from "../../config/banco-de-dados";
import type { LeituraVegetacao, StatusVegetacao } from "./leitura";

interface LinhaLeitura {
  dispositivo_id: string;
  altura_cm: string;
  status: StatusVegetacao;
  medido_em: Date;
}

function mapearLinhaParaLeitura(linha: LinhaLeitura): LeituraVegetacao {
  return {
    dispositivoId: linha.dispositivo_id,
    alturaCm: Number(linha.altura_cm),
    status: linha.status,
    medidoEm: linha.medido_em.toISOString(),
  };
}

export async function buscarLeituras(): Promise<LeituraVegetacao[]> {
  const resultado = await poolBancoDados.query<LinhaLeitura>(`
    SELECT dispositivo_id, altura_cm, status, medido_em
    FROM leituras
    ORDER BY medido_em ASC, id ASC
  `);

  return resultado.rows.map(mapearLinhaParaLeitura);
}

export async function buscarUltimaLeitura(): Promise<LeituraVegetacao | null> {
  const resultado = await poolBancoDados.query<LinhaLeitura>(`
    SELECT dispositivo_id, altura_cm, status, medido_em
    FROM leituras
    ORDER BY medido_em DESC, id DESC
    LIMIT 1
  `);

  const ultimaLinha = resultado.rows[0];
  return ultimaLinha ? mapearLinhaParaLeitura(ultimaLinha) : null;
}

