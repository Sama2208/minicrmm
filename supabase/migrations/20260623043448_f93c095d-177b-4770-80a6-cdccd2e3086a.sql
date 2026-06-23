CREATE OR REPLACE FUNCTION public.prevent_duplicate_phone()
RETURNS TRIGGER AS $$
DECLARE
  existing_id uuid;
BEGIN
  IF NEW.phone IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO existing_id
  FROM leads
  WHERE phone = NEW.phone
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE leads
    SET notes = COALESCE(notes, '') || 
                E'\n[Qayta murojaat: ' || to_char(NOW() AT TIME ZONE 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI') || ']' ||
                CASE WHEN NEW.notes IS NOT NULL AND NEW.notes != '' 
                     THEN ' — ' || NEW.notes 
                     ELSE '' 
                END,
        updated_at = NOW()
    WHERE id = existing_id;
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_duplicate_phone ON leads;

CREATE TRIGGER check_duplicate_phone
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_phone();