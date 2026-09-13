CREATE TABLE IF NOT EXISTS intervencoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  leitura_id BIGINT UNIQUE REFERENCES leituras(id) ON DELETE SET NULL,
  dispositivo_id VARCHAR(100) NOT NULL CHECK (BTRIM(dispositivo_id) <> ''),
  altura_cm NUMERIC(6, 2) NOT NULL CHECK (altura_cm >= 0),
  status_leitura VARCHAR(10) NOT NULL
    CHECK (status_leitura IN ('cuidado', 'perigo')),
  medido_em TIMESTAMPTZ NOT NULL,
  prioridade VARCHAR(10) NOT NULL
    CHECK (prioridade IN ('alta', 'moderada')),
  rodovia VARCHAR(100),
  km VARCHAR(50),
  sentido VARCHAR(100),
  trecho VARCHAR(255),
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_atendimento', 'concluida')),
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  iniciada_em TIMESTAMPTZ,
  concluida_em TIMESTAMPTZ,
  atualizada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE INDEX IF NOT EXISTS indice_intervencoes_ordenacao
  ON intervencoes (status, prioridade, criada_em DESC);
