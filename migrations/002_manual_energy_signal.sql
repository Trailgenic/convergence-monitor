-- up
ALTER TABLE signal_readings DROP CONSTRAINT IF EXISTS signal_readings_data_status_check;
ALTER TABLE signal_readings
  ADD CONSTRAINT signal_readings_data_status_check CHECK (data_status IN ('ok', 'unknown', 'placeholder', 'stale', 'error'));

DELETE FROM signal_readings
WHERE signal_name IN ('CAISO_LMP_USD_MWH', 'ERCOT_LMP_USD_MWH', 'PJM_LMP_USD_MWH');

INSERT INTO signal_readings (signal_category, signal_name, reading_value, reading_text, reading_date, threshold_breached, threshold_value, qualitative_severity, data_status, raw_payload)
SELECT 'energy', 'ENERGY_STRESS_MANUAL_ENTRY', NULL, 'Manual energy stress entry pending', CURRENT_DATE, FALSE, NULL, 'weak', 'unknown', '{"manual": true, "placeholder": true, "unconfirmed": true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM signal_readings WHERE signal_name = 'ENERGY_STRESS_MANUAL_ENTRY');

-- down
DELETE FROM signal_readings
WHERE signal_name = 'ENERGY_STRESS_MANUAL_ENTRY'
  AND data_status = 'unknown'
  AND threshold_breached = FALSE;

ALTER TABLE signal_readings DROP CONSTRAINT IF EXISTS signal_readings_data_status_check;
ALTER TABLE signal_readings
  ADD CONSTRAINT signal_readings_data_status_check CHECK (data_status IN ('ok', 'placeholder', 'stale', 'error'));
