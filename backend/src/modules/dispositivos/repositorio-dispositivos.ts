import { poolBancoDados } from "../../config/banco-de-dados";
import type {
  DadosLocalizacaoDispositivo,
  Dispositivo,
  OrigemLocalizacao,
} from "./dispositivo";

interface LinhaDispositivo {
  dispositivo_id: string;
  rodovia: string | null;
  km: string | null;
  sentido: string | null;
  trecho: string | null;
  latitude: number | null;
  longitude: number | null;
  origem_localizacao: OrigemLocalizacao | null;
  localizacao_atualizada_em: Date | string | null;
}

function mapearDispositivo(linha: LinhaDispositivo): Dispositivo {
  return {
    dispositivoId: linha.dispositivo_id,
    rodovia: linha.rodovia,
    km: linha.km,
    sentido: linha.sentido,
    trecho: linha.trecho,
    latitude: linha.latitude === null ? null : Number(linha.latitude),
    longitude: linha.longitude === null ? null : Number(linha.longitude),
    origemLocalizacao: linha.origem_localizacao,
    localizacaoAtualizadaEm:
      linha.localizacao_atualizada_em === null
        ? null
        : new Date(linha.localizacao_atualizada_em).toISOString(),
  };
}

export async function listarDispositivos(): Promise<Dispositivo[]> {
  const resultado = await poolBancoDados.query<LinhaDispositivo>(`
    WITH identificadores AS (
      SELECT DISTINCT dispositivo_id
      FROM leituras
      UNION
      SELECT dispositivo_id
      FROM dispositivos
    )
    SELECT
      identificadores.dispositivo_id,
      dispositivos.rodovia,
      dispositivos.km,
      dispositivos.sentido,
      dispositivos.trecho,
      dispositivos.latitude,
      dispositivos.longitude,
      dispositivos.origem_localizacao,
      dispositivos.localizacao_atualizada_em
    FROM identificadores
    LEFT JOIN dispositivos
      ON dispositivos.dispositivo_id = identificadores.dispositivo_id
    ORDER BY identificadores.dispositivo_id ASC
  `);

  return resultado.rows.map(mapearDispositivo);
}

export async function salvarLocalizacaoDispositivo(
  dispositivoId: string,
  dados: DadosLocalizacaoDispositivo,
): Promise<Dispositivo> {
  const resultado = await poolBancoDados.query<LinhaDispositivo>(
    `
      INSERT INTO dispositivos (
        dispositivo_id,
        rodovia,
        km,
        sentido,
        trecho,
        latitude,
        longitude,
        origem_localizacao,
        localizacao_atualizada_em
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (dispositivo_id) DO UPDATE SET
        rodovia = EXCLUDED.rodovia,
        km = EXCLUDED.km,
        sentido = EXCLUDED.sentido,
        trecho = EXCLUDED.trecho,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        origem_localizacao = EXCLUDED.origem_localizacao,
        localizacao_atualizada_em = NOW()
      RETURNING
        dispositivo_id,
        rodovia,
        km,
        sentido,
        trecho,
        latitude,
        longitude,
        origem_localizacao,
        localizacao_atualizada_em
    `,
    [
      dispositivoId,
      dados.rodovia,
      dados.km,
      dados.sentido,
      dados.trecho,
      dados.latitude,
      dados.longitude,
      dados.origemLocalizacao,
    ],
  );

  return mapearDispositivo(resultado.rows[0]);
}
