-- ============================================================
-- CLINIC OS — FAZA 2: KUNLIK YADRO
-- patients, appointments, rooms, check_ins, waitlist
-- + leads status kengaytirish (no_answer, unqualified, converted, lost)
-- ============================================================
-- Idempotent: qayta ishga tushirsa xato bermaydi.
-- Mavjud jadvallar buzilmaydi.
-- ============================================================

-- ============================================================
-- 1. PATIENTS (bemorlar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id),
  mrn         text NOT NULL,
  full_name   text NOT NULL,
  birth_date  date,
  gender      text CHECK (gender IN ('male','female')),
  phone       text,
  phone2      text,
  email       text,
  address     text,
  region      text,
  blood_type  text CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  allergies   text,
  notes       text,
  source      text,
  lead_id     uuid,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deceased')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  UNIQUE (clinic_id, mrn)
);

CREATE INDEX IF NOT EXISTS idx_patients_clinic ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(clinic_id, full_name);

-- ============================================================
-- 2. ROOMS (xonalar / kabinetlar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  uuid NOT NULL REFERENCES public.clinics(id),
  name       text NOT NULL,
  type       text NOT NULL DEFAULT 'consultation'
             CHECK (type IN ('consultation','procedure','lab','imaging','surgery','ward','other')),
  floor      text,
  capacity   int NOT NULL DEFAULT 1,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rooms_clinic ON public.rooms(clinic_id);

-- ============================================================
-- 3. APPOINTMENTS (qabullar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES public.clinics(id),
  patient_id    uuid NOT NULL REFERENCES public.patients(id),
  doctor_id     uuid,
  room_id       uuid REFERENCES public.rooms(id),
  scheduled_at  timestamptz NOT NULL,
  duration_min  int NOT NULL DEFAULT 30,
  end_at        timestamptz GENERATED ALWAYS AS (scheduled_at + (duration_min || ' minutes')::interval) STORED,
  status        text NOT NULL DEFAULT 'booked'
                CHECK (status IN ('booked','confirmed','checked_in','in_progress','completed','no_show','cancelled')),
  visit_type    text NOT NULL DEFAULT 'first_visit'
                CHECK (visit_type IN ('first_visit','follow_up','procedure','emergency')),
  reason        text,
  notes         text,
  source        text,
  lead_id       uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON public.appointments(clinic_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(clinic_id, status);

-- Ustma-ust qabul oldini olish (bitta doctor + bitta vaqt oraligi)
-- EXCLUDE constraint ishlatamiz
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- GiST index for overlap detection (doctor + time range)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_doctor_overlap'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT no_doctor_overlap
      EXCLUDE USING gist (
        doctor_id WITH =,
        tstzrange(scheduled_at, scheduled_at + (duration_min || ' minutes')::interval) WITH &&
      )
      WHERE (status NOT IN ('cancelled','no_show') AND deleted_at IS NULL AND doctor_id IS NOT NULL);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================
-- 4. APPOINTMENT_STATUS_HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointment_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id),
  appointment_id  uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  old_status      text,
  new_status      text NOT NULL,
  changed_by      uuid,
  changed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_status_hist ON public.appointment_status_history(appointment_id);

-- ============================================================
-- 5. CHECK_INS (qabulga kelish qayd etish)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.check_ins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id),
  appointment_id  uuid REFERENCES public.appointments(id),
  patient_id      uuid NOT NULL REFERENCES public.patients(id),
  checked_in_at   timestamptz NOT NULL DEFAULT now(),
  checked_in_by   uuid,
  notes           text
);

CREATE INDEX IF NOT EXISTS idx_checkins_clinic_date ON public.check_ins(clinic_id, checked_in_at);

-- ============================================================
-- 6. WAITLIST (navbat)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.waitlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id),
  patient_id  uuid NOT NULL REFERENCES public.patients(id),
  doctor_id   uuid,
  priority    int NOT NULL DEFAULT 0,
  reason      text,
  status      text NOT NULL DEFAULT 'waiting'
              CHECK (status IN ('waiting','called','seen','left')),
  added_at    timestamptz NOT NULL DEFAULT now(),
  called_at   timestamptz,
  seen_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_waitlist_clinic ON public.waitlist(clinic_id, status);

-- ============================================================
-- 7. PATIENT_NOTES (bemor yozuvlari)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patient_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id),
  patient_id  uuid NOT NULL REFERENCES public.patients(id),
  author_id   uuid,
  note_type   text NOT NULL DEFAULT 'general'
              CHECK (note_type IN ('general','clinical','phone_call','follow_up')),
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_patient_notes_patient ON public.patient_notes(patient_id);

-- ============================================================
-- 8. PATIENT_DOCUMENTS (hujjatlar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id),
  patient_id  uuid NOT NULL REFERENCES public.patients(id),
  file_name   text NOT NULL,
  file_path   text NOT NULL,
  file_type   text,
  file_size   bigint,
  category    text NOT NULL DEFAULT 'other'
              CHECK (category IN ('lab','imaging','prescription','referral','consent','id','other')),
  uploaded_by uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_patient_docs_patient ON public.patient_documents(patient_id);

-- ============================================================
-- 9. FUNKSIYALAR
-- ============================================================

-- MRN generatori: P-00001, P-00002... (klinika bo'yicha ketma-ket)
CREATE OR REPLACE FUNCTION public.generate_mrn(p_clinic_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next int;
BEGIN
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(mrn, '[^0-9]', '', 'g'), '')::int
  ), 0) + 1
  INTO v_next
  FROM public.patients
  WHERE clinic_id = p_clinic_id;

  RETURN 'P-' || lpad(v_next::text, 5, '0');
END;
$$;

-- book_appointment: qabul yaratish (ustma-ust tekshiruvi DB constraint orqali)
CREATE OR REPLACE FUNCTION public.book_appointment(
  p_clinic_id uuid,
  p_patient_id uuid,
  p_doctor_id uuid DEFAULT NULL,
  p_room_id uuid DEFAULT NULL,
  p_scheduled_at timestamptz DEFAULT NULL,
  p_duration_min int DEFAULT 30,
  p_visit_type text DEFAULT 'first_visit',
  p_reason text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_lead_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.appointments (
    clinic_id, patient_id, doctor_id, room_id,
    scheduled_at, duration_min, visit_type, reason, source, lead_id
  ) VALUES (
    p_clinic_id, p_patient_id, p_doctor_id, p_room_id,
    p_scheduled_at, p_duration_min, p_visit_type, p_reason, p_source, p_lead_id
  )
  RETURNING id INTO v_id;

  INSERT INTO public.appointment_status_history (clinic_id, appointment_id, new_status, changed_by)
  VALUES (p_clinic_id, v_id, 'booked', auth.uid());

  RETURN v_id;
END;
$$;

-- check_in: qabulga kelishni qayd etish
CREATE OR REPLACE FUNCTION public.do_check_in(
  p_appointment_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_appt RECORD;
BEGIN
  SELECT id, clinic_id, patient_id, status INTO v_appt
  FROM public.appointments WHERE id = p_appointment_id;

  IF v_appt IS NULL THEN
    RAISE EXCEPTION 'Qabul topilmadi';
  END IF;

  IF v_appt.status NOT IN ('booked','confirmed') THEN
    RAISE EXCEPTION 'Bu qabulni check-in qilib bolmaydi (status: %)', v_appt.status;
  END IF;

  UPDATE public.appointments SET status = 'checked_in' WHERE id = p_appointment_id;

  INSERT INTO public.appointment_status_history (clinic_id, appointment_id, old_status, new_status, changed_by)
  VALUES (v_appt.clinic_id, p_appointment_id, v_appt.status, 'checked_in', auth.uid());

  INSERT INTO public.check_ins (clinic_id, appointment_id, patient_id, checked_in_by)
  VALUES (v_appt.clinic_id, p_appointment_id, v_appt.patient_id, auth.uid());
END;
$$;

-- Appointment status o'zgarganda tarixga yozish trigger
CREATE OR REPLACE FUNCTION public.log_appointment_status_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.appointment_status_history
      (clinic_id, appointment_id, old_status, new_status, changed_by)
    VALUES (NEW.clinic_id, NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_status_change ON public.appointments;
CREATE TRIGGER trg_appointment_status_change
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.log_appointment_status_change();

-- ============================================================
-- 10. LEADS STATUS KENGAYTIRISH
-- Yangi enum qiymatlar: no_answer, unqualified, converted, lost
-- ============================================================
DO $$
BEGIN
  -- no_answer
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'no_answer'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lead_status')) THEN
    ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'no_answer';
  END IF;
  -- unqualified
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'unqualified'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lead_status')) THEN
    ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'unqualified';
  END IF;
  -- converted
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'converted'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lead_status')) THEN
    ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'converted';
  END IF;
  -- lost
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'lost'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lead_status')) THEN
    ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'lost';
  END IF;
END $$;

-- leads jadvaliga patient_id ustuni (konvertatsiya uchun)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id);

-- ============================================================
-- 11. TRIGGERLAR (updated_at)
-- ============================================================
DROP TRIGGER IF EXISTS trg_patients_updated ON public.patients;
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_rooms_updated ON public.rooms;
CREATE TRIGGER trg_rooms_updated BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_patient_notes_updated ON public.patient_notes;
CREATE TRIGGER trg_patient_notes_updated BEFORE UPDATE ON public.patient_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit triggerlar
DROP TRIGGER IF EXISTS trg_patients_audit ON public.patients;
CREATE TRIGGER trg_patients_audit AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();

DROP TRIGGER IF EXISTS trg_appointments_audit ON public.appointments;
CREATE TRIGGER trg_appointments_audit AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.write_audit();

-- ============================================================
-- 12. RLS
-- ============================================================

-- patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.patients FROM anon;

DROP POLICY IF EXISTS p_patients_select ON public.patients;
CREATE POLICY p_patients_select ON public.patients FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_patients_insert ON public.patients;
CREATE POLICY p_patients_insert ON public.patients FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS p_patients_update ON public.patients;
CREATE POLICY p_patients_update ON public.patients FOR UPDATE TO authenticated
  USING (clinic_id = public.current_clinic_id());

-- rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rooms FROM anon;

DROP POLICY IF EXISTS p_rooms_select ON public.rooms;
CREATE POLICY p_rooms_select ON public.rooms FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_rooms_write ON public.rooms;
CREATE POLICY p_rooms_write ON public.rooms FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id() AND public.current_user_is_admin())
  WITH CHECK (clinic_id = public.current_clinic_id() AND public.current_user_is_admin());

-- appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointments FROM anon;

DROP POLICY IF EXISTS p_appointments_select ON public.appointments;
CREATE POLICY p_appointments_select ON public.appointments FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_appointments_insert ON public.appointments;
CREATE POLICY p_appointments_insert ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS p_appointments_update ON public.appointments;
CREATE POLICY p_appointments_update ON public.appointments FOR UPDATE TO authenticated
  USING (clinic_id = public.current_clinic_id());

-- appointment_status_history
ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_status_history FROM anon;

DROP POLICY IF EXISTS p_appt_hist_select ON public.appointment_status_history;
CREATE POLICY p_appt_hist_select ON public.appointment_status_history FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id());

-- check_ins
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.check_ins FROM anon;

DROP POLICY IF EXISTS p_checkins_select ON public.check_ins;
CREATE POLICY p_checkins_select ON public.check_ins FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS p_checkins_insert ON public.check_ins;
CREATE POLICY p_checkins_insert ON public.check_ins FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());

-- waitlist
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.waitlist FROM anon;

DROP POLICY IF EXISTS p_waitlist_select ON public.waitlist;
CREATE POLICY p_waitlist_select ON public.waitlist FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id());

DROP POLICY IF EXISTS p_waitlist_write ON public.waitlist;
CREATE POLICY p_waitlist_write ON public.waitlist FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- patient_notes
ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.patient_notes FROM anon;

DROP POLICY IF EXISTS p_patient_notes_select ON public.patient_notes;
CREATE POLICY p_patient_notes_select ON public.patient_notes FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_patient_notes_write ON public.patient_notes;
CREATE POLICY p_patient_notes_write ON public.patient_notes FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- patient_documents
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.patient_documents FROM anon;

DROP POLICY IF EXISTS p_patient_docs_select ON public.patient_documents;
CREATE POLICY p_patient_docs_select ON public.patient_documents FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_patient_docs_write ON public.patient_documents;
CREATE POLICY p_patient_docs_write ON public.patient_documents FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- ============================================================
-- 13. GRANT'lar
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;

GRANT SELECT ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

GRANT SELECT ON public.appointment_status_history TO authenticated;
GRANT ALL ON public.appointment_status_history TO service_role;

GRANT SELECT, INSERT ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.patient_notes TO authenticated;
GRANT ALL ON public.patient_notes TO service_role;

GRANT SELECT, INSERT ON public.patient_documents TO authenticated;
GRANT ALL ON public.patient_documents TO service_role;

-- RPC funksiyalar uchun
REVOKE ALL ON FUNCTION public.generate_mrn(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_mrn(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.book_appointment(uuid, uuid, uuid, uuid, timestamptz, int, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, uuid, uuid, timestamptz, int, text, text, text, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.do_check_in(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.do_check_in(uuid) TO authenticated, service_role;

-- ============================================================
-- TAYYOR.
-- Test:
--   1) Bemor yaratish va MRN avtomatik generatsiyasi
--   2) Qabul yaratish (book_appointment)
--   3) Bitta doktorga ustma-ust qabul bloklanadi
--   4) Check-in ishlaydi
--   5) RLS: boshqa klinikadagi bemor ko'rinmaydi
-- ============================================================
