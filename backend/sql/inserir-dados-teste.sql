INSERT INTO leituras (dispositivo_id, altura_cm, status, medido_em)
SELECT
  dados.dispositivo_id,
  dados.altura_cm,
  dados.status,
  dados.medido_em
FROM (
  VALUES
    ('ESP-01', 18.7, 'seguro', '2026-08-13T00:55:00-03:00'::TIMESTAMPTZ),
    ('ESP-01', 31.4, 'cuidado', '2026-08-13T00:57:00-03:00'::TIMESTAMPTZ),
    ('ESP-01', 47.6, 'perigo', '2026-08-13T01:00:00-03:00'::TIMESTAMPTZ)
) AS dados (dispositivo_id, altura_cm, status, medido_em)
WHERE NOT EXISTS (
  SELECT 1
  FROM leituras AS leitura_existente
  WHERE leitura_existente.dispositivo_id = dados.dispositivo_id
    AND leitura_existente.medido_em = dados.medido_em
);

