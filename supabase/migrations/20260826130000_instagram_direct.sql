-- Instagram Direct kanali uchun funnel bosqichi va suhbat/xabar jadvallari.
-- Bu migratsiya avval qo'lda qo'llangan bo'lishi mumkin, shuning uchun barcha
-- sxema o'zgarishlari idempotent yozilgan.

ALTER TYPE public.lead_status
  ADD VALUE IF NOT EXISTS 'instagram_direct' BEFORE 'konsultatsiyaga_yozildi';

ALTER TABLE public.facebook_connections
  ADD COLUMN IF NOT EXISTS instagram_business_account_id text,
  ADD COLUMN IF NOT EXISTS instagram_username text,
  ADD COLUMN IF NOT EXISTS instagram_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_facebook_connections_instagram_account
  ON public.facebook_connections (instagram_business_account_id)
  WHERE instagram_business_account_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.instagram_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  facebook_connection_id uuid NOT NULL REFERENCES public.facebook_connections(id) ON DELETE CASCADE,
  instagram_business_account_id text NOT NULL,
  instagram_user_id text NOT NULL,
  instagram_username text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  unread_count integer NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, instagram_business_account_id, instagram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_lead
  ON public.instagram_conversations (clinic_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_operator
  ON public.instagram_conversations (clinic_id, assigned_to, status);

CREATE TABLE IF NOT EXISTS public.instagram_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.instagram_conversations(id) ON DELETE CASCADE,
  instagram_message_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_id text,
  recipient_id text,
  message_text text,
  media_type text,
  media_url text,
  payload jsonb,
  sent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, instagram_message_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_messages_conversation
  ON public.instagram_messages (conversation_id, sent_at);

ALTER TABLE public.instagram_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.instagram_conversations FROM anon, authenticated;
REVOKE ALL ON public.instagram_messages FROM anon, authenticated;
GRANT ALL ON public.instagram_conversations TO service_role;
GRANT ALL ON public.instagram_messages TO service_role;
