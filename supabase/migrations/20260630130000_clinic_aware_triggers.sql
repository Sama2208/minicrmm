-- =============================================================================
-- Triggerlarni clinic-aware qilish
-- =============================================================================
-- log_status_change va log_assignment_change triggerlar lead_status_history va
-- lead_assignment_history ga clinic_id qo'shmasdan yozardi. Multi-tenancy
-- migratsiyasidan keyin bu jadvallar clinic_id NOT NULL, shuning uchun
-- triggerlarni yangilash shart.
-- =============================================================================

-- Status tarixi: clinic_id ni leads dan oladi
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lead_status_history (lead_id, old_status, new_status, clinic_id, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.clinic_id, now());
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Operator biriktirilishi tarixi: clinic_id ni leads dan oladi
CREATE OR REPLACE FUNCTION public.log_assignment_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO lead_assignment_history (lead_id, old_assigned_to, new_assigned_to, clinic_id)
    VALUES (NEW.id, OLD.assigned_to, NEW.assigned_to, NEW.clinic_id);
  END IF;
  RETURN NEW;
END;
$$;
