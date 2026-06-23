CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  operator_name TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('gaplashdi', 'kotarmadi', 'qayta_kerak')),
  notes TEXT,
  called_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_logs TO authenticated;
GRANT ALL ON public.call_logs TO service_role;

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage call logs" ON public.call_logs
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);