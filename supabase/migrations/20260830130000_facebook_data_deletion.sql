-- Meta Data Deletion Callback qo‘llab-quvvatlashi.
-- Facebook foydalanuvchisining xom IDsi saqlanmaydi: faqat SHA-256 hash ishlatiladi.

ALTER TABLE public.facebook_oauth_sessions
  ADD COLUMN IF NOT EXISTS facebook_user_id_hash text;

ALTER TABLE public.facebook_connections
  ADD COLUMN IF NOT EXISTS facebook_user_id_hash text;

CREATE INDEX IF NOT EXISTS idx_facebook_connections_user_hash
  ON public.facebook_connections (facebook_user_id_hash)
  WHERE facebook_user_id_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.facebook_data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_user_id_hash text NOT NULL UNIQUE,
  confirmation_code uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'failed')),
  disabled_connection_count integer NOT NULL DEFAULT 0 CHECK (disabled_connection_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.facebook_data_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.facebook_data_deletion_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.facebook_data_deletion_requests TO service_role;
