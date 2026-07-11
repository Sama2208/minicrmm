-- ============================================================
-- CLINIC OS — FAZA 3: SHIFOKORLAR MODULI
-- doctors, doctor_schedules, doctor_time_off
-- ============================================================
-- Idempotent: qayta ishga tushirsa xato bermaydi.
-- ============================================================

-- ============================================================
-- 1. DOCTORS (shifokorlar profili)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.doctors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id),
  user_id         uuid REFERENCES public.users(id),
  full_name       text NOT NULL,
  specialty       text NOT NULL,
  license_number  text,
  phone           text,
  email           text,
  bio             text,
  avatar_url      text,
  consultation_duration_min int NOT NULL DEFAULT 30,
  consultation_fee numeric(12,2) DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_doctors_clinic ON public.doctors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON public.doctors(clinic_id, specialty);

-- ============================================================
-- 2. DOCTOR_SCHEDULES (haftalik jadval shabloni)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id),
  doctor_id   uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  room_id     uuid REFERENCES public.rooms(id),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  UNIQUE (doctor_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor ON public.doctor_schedules(doctor_id);

-- ============================================================
-- 3. DOCTOR_TIME_OFF (dam olish, ta'til, kasallik)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.doctor_time_off (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id),
  doctor_id   uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  reason      text NOT NULL DEFAULT 'vacation'
              CHECK (reason IN ('vacation','sick','conference','personal','other')),
  notes       text,
  approved_by uuid REFERENCES public.users(id),
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','rejected')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_doctor_time_off_doctor ON public.doctor_time_off(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_time_off_dates ON public.doctor_time_off(doctor_id, start_date, end_date);

-- ============================================================
-- 4. TRIGGERS
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_doctors'
  ) THEN
    CREATE TRIGGER set_updated_at_doctors
      BEFORE UPDATE ON public.doctors
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_time_off ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'doctors_clinic_isolation') THEN
    CREATE POLICY doctors_clinic_isolation ON public.doctors
      USING (clinic_id = public.current_clinic_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'doctor_schedules_clinic_isolation') THEN
    CREATE POLICY doctor_schedules_clinic_isolation ON public.doctor_schedules
      USING (clinic_id = public.current_clinic_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'doctor_time_off_clinic_isolation') THEN
    CREATE POLICY doctor_time_off_clinic_isolation ON public.doctor_time_off
      USING (clinic_id = public.current_clinic_id());
  END IF;
END $$;

-- ============================================================
-- 6. PERMISSIONS (Faza 3 uchun)
-- ============================================================
INSERT INTO public.permissions (code, description) VALUES
  ('doctor.view',     'Shifokorlar ro''yxatini ko''rish'),
  ('doctor.create',   'Yangi shifokor qo''shish'),
  ('doctor.edit',     'Shifokor ma''lumotlarini tahrirlash'),
  ('doctor.delete',   'Shifokorni o''chirish'),
  ('schedule.view',   'Jadvallarni ko''rish'),
  ('schedule.manage', 'Jadvallarni boshqarish')
ON CONFLICT (code) DO NOTHING;

-- Director va Reception ga schedule.view, doctor.view
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug IN ('director','reception')
  AND p.code IN ('doctor.view','schedule.view')
ON CONFLICT DO NOTHING;

-- Director ga barcha doctor/schedule permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'director'
  AND p.code IN ('doctor.create','doctor.edit','doctor.delete','schedule.manage')
ON CONFLICT DO NOTHING;

-- Doctor o'zini ko'rish uchun
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.slug = 'doctor'
  AND p.code IN ('doctor.view','schedule.view')
ON CONFLICT DO NOTHING;
