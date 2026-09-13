CREATE TABLE IF NOT EXISTS dispositivos (
  dispositivo_id VARCHAR(100) PRIMARY KEY CHECK (BTRIM(dispositivo_id) <> ''),
  rodovia VARCHAR(100),
  km VARCHAR(50),
  sentido VARCHAR(100),
  trecho VARCHAR(255),
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  origem_localizacao VARCHAR(30)
    CHECK (
      origem_localizacao IS NULL
      OR origem_localizacao IN ('manual', 'navegador')
    ),
  localizacao_atualizada_em TIMESTAMPTZ,
  CHECK ((latitude IS NULL) = (longitude IS NULL))
);
