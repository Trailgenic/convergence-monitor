-- up
ALTER TABLE signal_readings
  ADD COLUMN IF NOT EXISTS qualitative_severity TEXT DEFAULT 'weak' CHECK (qualitative_severity IN ('weak', 'moderate', 'severe')),
  ADD COLUMN IF NOT EXISTS data_status TEXT DEFAULT 'ok' CHECK (data_status IN ('ok', 'placeholder', 'stale', 'error'));

UPDATE signal_readings
SET data_status = 'placeholder'
WHERE data_status = 'ok' AND (
  reading_value IS NULL AND COALESCE(NULLIF(BTRIM(reading_text), ''), '') = ''
  OR reading_text ~* '(placeholder|until|not configured|not yet wired|\mtbd\M|n/a-data)'
  OR reading_value::text ~* '(placeholder|until|not configured|not yet wired|\mtbd\M|n/a-data)'
);

-- down
ALTER TABLE signal_readings
  DROP COLUMN IF EXISTS data_status,
  DROP COLUMN IF EXISTS qualitative_severity;
