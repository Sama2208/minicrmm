-- Round-robin counter: yangi lidlar 0 dan boshlansin, eski 162 ta hisobga olinmasin

CREATE TABLE IF NOT EXISTS public.operator_rr_counter (
  id int PRIMARY KEY DEFAULT 1,
  counter bigint NOT NULL DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO public.operator_rr_counter (id, counter) VALUES (1, 0) ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operator_rr_counter TO anon, authenticated;

-- get_next_operator() ni counter asosida qayta yozish
CREATE OR REPLACE FUNCTION public.get_next_operator()
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_op uuid;
  op_count int;
  current_idx bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('assign_operator'));

  SELECT COUNT(*) INTO op_count FROM operators WHERE is_active = true;
  IF op_count = 0 THEN RETURN NULL; END IF;

  UPDATE operator_rr_counter
  SET counter = counter + 1
  WHERE id = 1
  RETURNING counter - 1 INTO current_idx;

  SELECT id INTO next_op
  FROM operators
  WHERE is_active = true
  ORDER BY created_at ASC, full_name ASC
  LIMIT 1
  OFFSET (current_idx % op_count);

  RETURN next_op;
END;
$$;
