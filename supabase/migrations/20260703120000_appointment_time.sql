-- =============================================================================
-- Qabul jadvali (kalendar) uchun vaqt maydoni
-- =============================================================================
-- appointment_date faqat sana (kun) saqlaydi — kalendarda "bugun soat
-- nechada kim keladi" tartibida ko'rsatish uchun vaqt ham kerak.
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS appointment_time time;
