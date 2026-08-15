CREATE TABLE IF NOT EXISTS leituras (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dispositivo_id VARCHAR(100) NOT NULL CHECK (BTRIM(dispositivo_id) <> ''),
  altura_cm NUMERIC(6, 2) NOT NULL CHECK (altura_cm >= 0),
  status VARCHAR(10) NOT NULL CHECK (status IN ('seguro', 'cuidado', 'perigo')),
  medido_em TIMESTAMPTZ NOT NULL,
  nome_imagem VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS indice_leituras_medido_em
  ON leituras (medido_em DESC);
